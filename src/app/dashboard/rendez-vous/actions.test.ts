import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  sendEmail: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from, rpc: mocks.rpc }),
}));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "mywork.website" }) }));

import { addException, ownerCancel, ownerReschedule, removeException, saveSettings } from "./actions";

type Reply = { data?: unknown; count?: number; error: { message: string } | null };
const replies: Reply[] = [];
const calls: { table: string; ops: [string, unknown[]][] }[] = [];

function query(table: string) {
  const record = { table, ops: [] as [string, unknown[]][] };
  calls.push(record);
  const q: Record<string, unknown> = {};
  for (const m of ["select", "upsert", "insert", "delete", "eq"]) {
    q[m] = (...args: unknown[]) => {
      record.ops.push([m, args]);
      return q;
    };
  }
  q.then = (resolve: (r: Reply) => unknown) => Promise.resolve(replies.shift() ?? { error: null }).then(resolve);
  return q;
}

const ID = "5b3f0c1e-1111-4222-8333-444455556666";
const hours = [{ weekday: 1, start: "09:00", end: "12:00" }];
const appointment = {
  id: ID, token: ID, status: "cancelled", starts_at: "2026-10-23T07:30:00Z", ends_at: "2026-10-23T08:00:00Z",
  duration_min: 30, guest_first: "Camille", guest_last: "Laurent", guest_email: "camille@exemple.fr", message: "",
  owner_username: "claire", owner_name: "Claire Moreau", owner_email: "claire@exemple.fr",
};

beforeEach(() => {
  vi.clearAllMocks();
  replies.length = 0;
  calls.length = 0;
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mocks.from.mockImplementation((table: string) => query(table));
  mocks.redirect.mockImplementation(() => {
    throw new Error("REDIRECT");
  });
  mocks.sendEmail.mockResolvedValue({ sent: true });
});

describe("saveSettings", () => {
  it("enregistre l'activation, les durées triées et les horaires d'un seul bloc", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const result = await saveSettings({ enabled: true, durations: [60, 30, 30], hours });
    expect(result).toEqual({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith("rdv_save_settings", {
      p_enabled: true,
      p_durations: [30, 60],
      p_hours: [{ weekday: 1, start: "09:00", end: "12:00" }],
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/rendez-vous");
  });

  it("signale un refus de la base sans détail interne", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "rdv_invalid" } });
    expect(await saveSettings({ enabled: true, durations: [30], hours })).toEqual({
      ok: false,
      error: "Impossible d'enregistrer. Réessaie.",
    });
  });

  it("refuse des horaires ou des durées invalides sans toucher à la base", async () => {
    expect(await saveSettings({ enabled: true, durations: [], hours })).toMatchObject({ ok: false });
    expect(await saveSettings({ enabled: true, durations: [30], hours: [{ weekday: 1, start: "12:00", end: "09:00" }] })).toMatchObject({ ok: false });
    expect(await saveSettings({ enabled: true, durations: [30], hours: [{ weekday: 1, start: "09:02", end: "10:00" }] })).toMatchObject({ ok: false });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("renvoie vers la connexion sans session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(saveSettings({ enabled: true, durations: [30], hours })).rejects.toThrow("REDIRECT");
  });
});

describe("exceptions", () => {
  it("ferme un jour entier ou fixe des horaires particuliers", async () => {
    replies.push({ count: 0, error: null });
    expect(await addException({ day: "2026-10-30" })).toEqual({ ok: true });
    expect(calls[1].ops[0][1]).toEqual([{ owner_id: "user-1", day: "2026-10-30", start_time: null, end_time: null }]);
    replies.push({ count: 0, error: null });
    expect(await addException({ day: "2026-10-30", start: "16:00", end: "17:00" })).toEqual({ ok: true });
  });

  it("refuse une date, des heures incomplètes ou à l'envers", async () => {
    expect(await addException({ day: "demain" })).toMatchObject({ ok: false });
    expect(await addException({ day: "2026-10-30", start: "16:00" })).toMatchObject({ ok: false });
    expect(await addException({ day: "2026-10-30", start: "17:00", end: "16:00" })).toMatchObject({ ok: false });
    expect(await addException({ day: "2026-10-30", start: "16:02", end: "17:00" })).toMatchObject({ ok: false });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("limite à 100 exceptions", async () => {
    replies.push({ count: 100, error: null });
    expect(await addException({ day: "2026-10-30" })).toEqual({ ok: false, error: "100 exceptions au maximum." });
  });

  it("supprime une exception de son propriétaire seulement", async () => {
    expect(await removeException(ID)).toEqual({ ok: true });
    expect(calls[0].ops).toContainEqual(["eq", ["owner_id", "user-1"]]);
    expect(await removeException("pas-un-id")).toMatchObject({ ok: false });
  });
});

describe("annulation et report par le propriétaire", () => {
  it("annule et prévient le visiteur", async () => {
    mocks.rpc.mockResolvedValue({ data: appointment, error: null });
    expect(await ownerCancel(ID)).toEqual({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith("rdv_owner_cancel", { p_id: ID });
    expect(mocks.sendEmail.mock.calls[0][0].to).toBe("camille@exemple.fr");
  });

  it("n'envoie rien si la base refuse (rendez-vous d'un autre, déjà passé…)", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "rdv_invalid" } });
    expect(await ownerCancel(ID)).toMatchObject({ ok: false });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("reporte et prévient le visiteur", async () => {
    const after = { ...appointment, starts_at: "2026-10-23T12:00:00Z", ends_at: "2026-10-23T12:30:00Z" };
    mocks.rpc.mockResolvedValue({ data: { before: appointment, after }, error: null });
    expect(await ownerReschedule(ID, "2026-10-23T12:00:00Z")).toEqual({ ok: true });
    expect(mocks.sendEmail.mock.calls[0][0].to).toBe("camille@exemple.fr");
    expect(mocks.sendEmail.mock.calls[0][0].text).toContain("Nouveau créneau");
  });

  it("dit quand le nouveau créneau est pris", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "rdv_slot_taken" } });
    expect(await ownerReschedule(ID, "2026-10-23T12:00:00Z")).toEqual({
      ok: false,
      error: "Ce créneau vient d'être pris. Choisis-en un autre.",
    });
  });
});
