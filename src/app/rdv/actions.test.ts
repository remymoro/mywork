import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  sendEmail: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "mywork.website", "x-forwarded-proto": "https" }),
}));

import { rdvErrorMessage } from "@/lib/rdv";
import { bookAppointment, cancelAppointment, rescheduleAppointment } from "./actions";

const TOKEN = "5b3f0c1e-1111-4222-8333-444455556666";
const appointment = {
  id: "a1",
  token: TOKEN,
  status: "confirmed",
  starts_at: "2026-10-23T07:30:00Z",
  ends_at: "2026-10-23T08:00:00Z",
  duration_min: 30,
  guest_first: "Camille",
  guest_last: "Laurent",
  guest_email: "camille@exemple.fr",
  message: "",
  owner_username: "claire",
  owner_name: "Claire Moreau",
  owner_email: "claire@exemple.fr",
};
const input = {
  username: "claire",
  start: "2026-10-23T07:30:00Z",
  duration: 30,
  first: "Camille",
  last: "Laurent",
  email: "camille@exemple.fr",
  message: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendEmail.mockResolvedValue({ sent: true });
});

describe("bookAppointment", () => {
  it("réserve, puis envoie la confirmation au visiteur et la notification au propriétaire", async () => {
    mocks.rpc.mockResolvedValue({ data: appointment, error: null });
    const result = await bookAppointment(input);
    expect(result).toEqual({
      ok: true,
      appointment: { token: TOKEN, starts_at: appointment.starts_at, duration_min: 30, owner_name: "Claire Moreau" },
    });
    expect(mocks.rpc).toHaveBeenCalledWith("rdv_book", expect.objectContaining({ p_username: "claire", p_duration: 30 }));
    const recipients = mocks.sendEmail.mock.calls.map(([mail]) => mail.to).sort();
    expect(recipients).toEqual(["camille@exemple.fr", "claire@exemple.fr"]);
    expect(mocks.sendEmail.mock.calls[0][0].text + mocks.sendEmail.mock.calls[1][0].text).toContain(
      `https://mywork.website/rdv/${TOKEN}`,
    );
  });

  it("refuse une saisie invalide sans appeler la base", async () => {
    const result = await bookAppointment({ ...input, email: "pas-un-email" });
    expect(result).toMatchObject({ ok: false });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("ignore les robots qui remplissent le champ piège", async () => {
    expect(await bookAppointment({ ...input, website: "http://spam" })).toMatchObject({ ok: false });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("signale un créneau déjà pris, sans envoyer d'e-mail", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "rdv_slot_taken" } });
    expect(await bookAppointment(input)).toEqual({
      ok: false,
      error: "Ce créneau vient d'être pris. Choisis-en un autre.",
      slotTaken: true,
    });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("réserve quand même si un e-mail ne part pas", async () => {
    mocks.rpc.mockResolvedValue({ data: appointment, error: null });
    mocks.sendEmail.mockResolvedValue({ sent: false, reason: "error" });
    expect(await bookAppointment(input)).toMatchObject({ ok: true });
  });
});

describe("rdvErrorMessage", () => {
  it("ne montre jamais les détails internes", () => {
    expect(rdvErrorMessage({ message: "duplicate key value violates ..." }).error).toBe(
      "Impossible d'enregistrer le rendez-vous. Réessaie dans un instant.",
    );
    expect(rdvErrorMessage({ message: "rdv_limit" }).error).toMatch(/Trop de réservations/);
  });
});

describe("annulation et report par le visiteur", () => {
  it("annule avec le lien privé et prévient le propriétaire", async () => {
    mocks.rpc.mockResolvedValue({ data: { ...appointment, status: "cancelled" }, error: null });
    expect(await cancelAppointment(TOKEN)).toEqual({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith("rdv_cancel", { p_token: TOKEN });
    expect(mocks.sendEmail.mock.calls[0][0].to).toBe("claire@exemple.fr");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/rdv/${TOKEN}`);
  });

  it("refuse un lien qui n'est pas un code valide", async () => {
    expect(await cancelAppointment("n'importe-quoi")).toMatchObject({ ok: false });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reporte et prévient le propriétaire avec l'ancien et le nouveau créneau", async () => {
    const after = { ...appointment, starts_at: "2026-10-23T12:00:00Z", ends_at: "2026-10-23T12:30:00Z" };
    mocks.rpc.mockResolvedValue({ data: { before: appointment, after }, error: null });
    expect(await rescheduleAppointment(TOKEN, "2026-10-23T12:00:00Z")).toEqual({ ok: true });
    expect(mocks.sendEmail.mock.calls[0][0].text).toContain("Nouveau créneau");
  });

  it("signale un créneau pris au report", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "rdv_slot_taken" } });
    expect(await rescheduleAppointment(TOKEN, "2026-10-23T12:00:00Z")).toMatchObject({ ok: false, slotTaken: true });
  });
});
