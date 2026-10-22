import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./email";

const email = { to: "a@b.fr", subject: "Sujet", text: "Texte", html: "<p>Texte</p>" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendEmail", () => {
  it("n'envoie rien sans clé Resend et écrit le message dans les journaux", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchMock = vi.fn();
    expect(await sendEmail(email, fetchMock as never)).toEqual({ sent: false, reason: "no-key" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalled();
  });

  it("appelle Resend avec la clé et l'expéditeur configurés", async () => {
    vi.stubEnv("RESEND_API_KEY", "cle-de-test");
    vi.stubEnv("RESEND_FROM", "MyWork <rdv@mywork.website>");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    expect(await sendEmail(email, fetchMock as never)).toEqual({ sent: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer cle-de-test");
    expect(JSON.parse(init.body)).toMatchObject({ from: "MyWork <rdv@mywork.website>", to: ["a@b.fr"], subject: "Sujet" });
  });

  it("ne lève pas d'erreur si Resend refuse ou si le réseau tombe", async () => {
    vi.stubEnv("RESEND_API_KEY", "cle-de-test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendEmail(email, vi.fn().mockResolvedValue({ ok: false, status: 403 }) as never)).toEqual({
      sent: false,
      reason: "error",
    });
    expect(await sendEmail(email, vi.fn().mockRejectedValue(new Error("réseau")) as never)).toEqual({
      sent: false,
      reason: "error",
    });
  });
});
