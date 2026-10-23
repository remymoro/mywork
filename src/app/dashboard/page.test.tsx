import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardData } from "@/lib/dashboard";
import DashboardPage from "./page";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(), getUser: vi.fn(), from: vi.fn(), rpc: vi.fn(), headers: vi.fn(),
  redirect: vi.fn((path: string): never => { throw new Error(`redirection:${path}`); }),
}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("./shell", () => ({ DashboardShell: () => null }));
vi.mock("./dashboard-view", () => ({ DashboardView: () => null }));
vi.mock("./dashboard-refresh", () => ({ DashboardRefresh: () => null }));

type Result = { data: unknown; error: { message: string } | null; count?: number };
type Call = { table: string; method: string; args: unknown[] };
let calls: Call[];
let profile: Result;
let failedTables: Set<string>;
let rejectedTables: Set<string>;
let boardPages: boolean;
let failSecondPage: boolean;

function query(table: string) {
  let limit = 0;
  let offset = 0;
  function result(): Result {
    if (rejectedTables.has(table)) throw new Error("réseau indisponible");
    if (failedTables.has(table) || (failSecondPage && table === "kanban_boards" && offset === 500)) {
      return { data: null, error: { message: "lecture refusée" } };
    }
    if (table === "profiles") return profile;
    if (table === "rdv_settings") return { data: null, error: null };
    if (table === "rdv_appointments" && limit === 1) return { data: null, error: null };
    if (table === "drive_files") return { data: null, error: null, count: 12 };
    if (table === "kanban_boards" && boardPages) {
      return {
        data: Array.from({ length: offset === 0 ? 500 : 1 }, (_, n) => ({ id: `board-${offset + n}`, name: `Tableau ${offset + n}`, owner_id: "shared-owner" })),
        error: null,
      };
    }
    return { data: [], error: null, count: 0 };
  }
  const builder = {
    select: (...args: unknown[]) => chain("select", args),
    eq: (...args: unknown[]) => chain("eq", args),
    gt: (...args: unknown[]) => chain("gt", args),
    gte: (...args: unknown[]) => chain("gte", args),
    lt: (...args: unknown[]) => chain("lt", args),
    order: (...args: unknown[]) => chain("order", args),
    range: (from: number, to: number) => { offset = from; return chain("range", [from, to]); },
    limit: (n: number) => { limit = n; return chain("limit", [n]); },
    maybeSingle: () => chain("maybeSingle", []),
    returns: () => chain("returns", []),
    then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve().then(result).then(resolve, reject),
  };
  function chain(method: string, args: unknown[]) { calls.push({ table, method, args }); return builder; }
  return builder;
}

async function loadData(): Promise<DashboardData> {
  const tree = await DashboardPage();
  return tree.props.children[1].props.data;
}

beforeEach(() => {
  vi.clearAllMocks(); calls = []; failedTables = new Set(); rejectedTables = new Set();
  boardPages = false; failSecondPage = false;
  profile = { data: { username: "remy", display_name: "Rémy", is_online: true }, error: null };
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner", email: "owner@example.test" } } });
  mocks.headers.mockResolvedValue(new Headers({ host: "localhost:3000", "x-forwarded-host": "preview.example.test", "x-forwarded-proto": "https" }));
  mocks.from.mockImplementation(query); mocks.rpc.mockImplementation(query);
});

describe("lectures serveur du tableau de bord (Supabase simulé)", () => {
  it("redirige vers login avant toute lecture en l'absence de session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(DashboardPage()).rejects.toThrow("redirection:/login");
    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("redirige vers onboarding seulement si le profil est absent après lecture réussie", async () => {
    profile = { data: null, error: null };
    await expect(DashboardPage()).rejects.toThrow("redirection:/onboarding");
  });
  it("conserve une erreur de lecture du profil sans redirection", async () => {
    profile = { data: null, error: { message: "lecture refusée" } };
    await expect(DashboardPage()).rejects.toThrow("Lecture du profil impossible");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("lit toutes les pages de tableaux partagés et garde le total au-delà de l'aperçu", async () => {
    boardPages = true;
    const data = await loadData();
    expect(data.kanban).toMatchObject({ state: "ready", data: { boardCount: 501 } });
    if (data.kanban.state === "ready") expect(data.kanban.data.boards).toHaveLength(3);
    expect(calls.filter((c) => c.table === "kanban_boards" && c.method === "range").map((c) => c.args)).toEqual([[0, 499], [500, 999]]);
    expect(calls.filter((c) => c.table.startsWith("kanban_") && c.method === "eq")).toEqual([]);
  });
  it("ne présente aucun total partiel si la deuxième page Kanban échoue", async () => {
    boardPages = true; failSecondPage = true;
    const data = await loadData();
    expect(data.kanban).toEqual({ state: "error", message: "Informations indisponibles" });
    expect(data.drive.state).toBe("ready");
  });
  it("isole les erreurs Supabase et les rejets réseau dans leur bloc", async () => {
    failedTables.add("kanban_lists"); rejectedTables.add("storage_usage");
    const data = await loadData();
    expect(data.kanban.state).toBe("error");
    expect(data.drive).toMatchObject({ state: "ready", data: { fileCount: 12, storage: { state: "error" } } });
    expect(data.nextAppointment.state).toBe("ready");
  });
  it("utilise les en-têtes du site, les compteurs exacts et aucun filtre de dossier", async () => {
    const data = await loadData();
    expect(data.profile.publicUrl).toBe("https://preview.example.test/remy");
    expect(calls.filter((c) => c.table === "drive_files" && c.method === "select").map((c) => c.args)).toEqual([
      ["id", { count: "exact", head: true }], ["id", { count: "exact", head: true }],
    ]);
    expect(calls.some((c) => c.table === "drive_files" && c.args.includes("folder_id"))).toBe(false);
    expect(calls.filter((c) => c.table === "rdv_appointments" && c.method === "gt").every((c) => c.args[0] === "ends_at")).toBe(true);
    expect(calls.some((c) => c.table === "rdv_appointments" && c.method === "select" && (c.args[1] as { count?: string })?.count === "exact")).toBe(true);
    expect(calls.some((c) => c.table === "rdv_appointments" && c.method === "limit" && c.args[0] === 3)).toBe(true);
    expect(calls.some((c) => c.table === "profile_experiences" && c.method === "eq" && c.args[0] === "is_visible" && c.args[1] === true)).toBe(true);
    expect(calls.some((c) => c.table === "profile_projects" && c.method === "eq" && c.args[0] === "is_visible" && c.args[1] === true)).toBe(true);
  });
  it("construit aussi l'adresse locale sans en-tête de proxy", async () => {
    mocks.headers.mockResolvedValue(new Headers({ host: "localhost:3000" }));
    expect((await loadData()).profile.publicUrl).toBe("http://localhost:3000/remy");
  });
});
