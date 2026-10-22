// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockIssue = vi.hoisted(() => vi.fn());
vi.mock("@/lib/visio-server", () => ({
  issueVisioToken: mockIssue,
  VisioError: class extends Error {
    constructor(public code: string, message: string, public status: number) { super(message); }
  },
}));
import { VisioError } from "@/lib/visio-server";
import { POST } from "./route";

const id = "9a8b7c6d-1111-4222-8333-444455556666";
const origin = "https://mywork.website";
const result = { token: "jeton-fictif", serverUrl: "wss://visio.example.test", endsAt: "2026-10-23T08:00:00Z", serverNow: "2026-10-23T07:30:00Z" };
const request = (body: unknown, headers: Record<string, string> = {}) => new Request(`${origin}/api/visio/token`, {
  method: "POST", headers: { origin, "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
});
beforeEach(() => { mockIssue.mockReset().mockResolvedValue(result); });

describe("POST /api/visio/token", () => {
  it.each([{ role: "guest", token: id }, { role: "owner", id }])("accepte %s et interdit la mise en cache", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
    expect(await response.json()).toEqual(result);
    expect(mockIssue).toHaveBeenCalledWith(body);
  });

  it.each(["https://ailleurs.example", "null", ""])("refuse l'origine %s", async (other) => {
    const response = await POST(request({ role: "guest", token: id }, { origin: other }));
    expect(response.status).toBe(403);
    expect(mockIssue).not.toHaveBeenCalled();
  });

  it("refuse l'absence d'origine et les formulaires", async () => {
    const req = request({ role: "guest", token: id });
    req.headers.delete("origin");
    expect((await POST(req)).status).toBe(403);
    expect((await POST(request({}, { "Content-Type": "text/plain" }))).status).toBe(415);
    expect(mockIssue).not.toHaveBeenCalled();
  });

  it.each([null, [], {}, { role: "guest", token: "faux" }, { role: "owner", id, identity: "autre" }, { role: "guest", token: id, endsAt: "demain" }])("refuse un JSON invalide ou des champs supplémentaires (%s)", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(mockIssue).not.toHaveBeenCalled();
  });

  it("refuse le JSON mal formé et un corps trop grand", async () => {
    const response = await POST(new Request(`${origin}/api/visio/token`, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: "{" }));
    expect(response.status).toBe(400);
    expect((await POST(request("x".repeat(1025)))).status).toBe(400);
    expect(mockIssue).not.toHaveBeenCalled();
  });

  it.each([401, 404, 409, 410, 503])("conserve le refus %s et no-store", async (status) => {
    mockIssue.mockRejectedValue(new VisioError("refus", "Accès refusé.", status));
    const response = await POST(request({ role: "owner", id }));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: "Accès refusé.", code: "refus" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("masque une erreur inattendue", async () => {
    mockIssue.mockRejectedValue(new Error("secret interne"));
    const response = await POST(request({ role: "owner", id }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret interne");
  });
});
