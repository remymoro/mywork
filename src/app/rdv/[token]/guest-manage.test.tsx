import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cancelAppointment: vi.fn(), rescheduleAppointment: vi.fn(), refresh: vi.fn() }));
vi.mock("../actions", () => ({
  cancelAppointment: mocks.cancelAppointment,
  rescheduleAppointment: mocks.rescheduleAppointment,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

import { DEFAULT_HOURS, type RdvConfig } from "@/lib/rdv";
import { GuestManage } from "./guest-manage";

const TOKEN = "5b3f0c1e-1111-4222-8333-444455556666";
const NOW = "2026-10-22T08:00:00Z"; // jeudi 22 octobre, 10 h à Paris
const config: RdvConfig = { durations: [30], hours: DEFAULT_HOURS, exceptions: [], busy: [] };
const appointment = {
  status: "confirmed" as const,
  starts_at: "2026-10-23T07:30:00Z", // vendredi 23 octobre, 09:30
  ends_at: "2026-10-23T08:00:00Z",
  duration_min: 30,
  owner_name: "Claire Moreau",
};

const setup = (over: Partial<Parameters<typeof GuestManage>[0]> = {}) =>
  render(<GuestManage token={TOKEN} appointment={appointment} config={config} nowIso={NOW} {...over} />);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cancelAppointment.mockResolvedValue({ ok: true });
  mocks.rescheduleAppointment.mockResolvedValue({ ok: true });
});

describe("GuestManage", () => {
  it("affiche le rendez-vous confirmé en heure de Paris", () => {
    setup();
    expect(screen.getByText("CONFIRMÉ")).toBeInTheDocument();
    expect(screen.getByText("vendredi 23 octobre 2026 à 09:30 (heure de Paris), 30 min")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rejoindre la visio" })).toHaveAttribute("href", `/rdv/${TOKEN}/visio`);
  });

  it("garde le rendez-vous en cours accessible jusqu'à ends_at", () => {
    const { unmount } = setup({ nowIso: appointment.starts_at });
    expect(screen.getByText("CONFIRMÉ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rejoindre la visio" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reporter" })).not.toBeInTheDocument();
    unmount();
    setup({ nowIso: appointment.ends_at });
    expect(screen.getByText("TERMINÉ")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Rejoindre la visio" })).not.toBeInTheDocument();
  });

  it("demande confirmation avant d'annuler, puis annule", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Annuler le rendez-vous" }));
    expect(mocks.cancelAppointment).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Oui, annuler" }));
    await waitFor(() => expect(mocks.cancelAppointment).toHaveBeenCalledWith(TOKEN));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("permet de garder le rendez-vous après avoir hésité", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Annuler le rendez-vous" }));
    fireEvent.click(screen.getByRole("button", { name: "Garder le rendez-vous" }));
    expect(screen.getByRole("button", { name: "Reporter" })).toBeInTheDocument();
  });

  it("reporte sur un créneau libre d'un autre jour", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Reporter" }));
    fireEvent.change(screen.getByLabelText(/Nouveau jour/), { target: { value: "2026-10-26" } });
    fireEvent.click(screen.getByRole("button", { name: "14:00" }));
    await waitFor(() => expect(mocks.rescheduleAppointment).toHaveBeenCalledWith(TOKEN, "2026-10-26T13:00:00.000Z"));
    expect(await screen.findByText("NOUVEAU CRÉNEAU")).toBeInTheDocument();
  });

  it("dit quand aucun créneau n'est libre un jour donné", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Reporter" }));
    fireEvent.change(screen.getByLabelText(/Nouveau jour/), { target: { value: "2026-10-24" } }); // samedi
    expect(screen.getByText("Aucun créneau libre ce jour-là.")).toBeInTheDocument();
  });

  it("montre l'erreur renvoyée par le serveur", async () => {
    mocks.rescheduleAppointment.mockResolvedValue({ ok: false, error: "Ce créneau vient d'être pris. Choisis-en un autre." });
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Reporter" }));
    fireEvent.change(screen.getByLabelText(/Nouveau jour/), { target: { value: "2026-10-26" } });
    fireEvent.click(screen.getByRole("button", { name: "14:00" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ce créneau vient d'être pris");
  });

  it("n'offre aucune action sur un rendez-vous annulé ou passé", () => {
    const { unmount } = setup({ appointment: { ...appointment, status: "cancelled" } });
    expect(screen.getByText("Rendez-vous annulé")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Rejoindre la visio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reporter" })).not.toBeInTheDocument();
    unmount();
    setup({ appointment: { ...appointment, starts_at: "2026-10-20T07:30:00Z", ends_at: "2026-10-20T08:00:00Z" } });
    expect(screen.getByText("TERMINÉ")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler le rendez-vous" })).not.toBeInTheDocument();
  });
});
