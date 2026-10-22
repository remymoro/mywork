import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveSettings: vi.fn(),
  addException: vi.fn(),
  removeException: vi.fn(),
  ownerCancel: vi.fn(),
  ownerReschedule: vi.fn(),
}));
vi.mock("./actions", () => mocks);

import { DEFAULT_HOURS } from "@/lib/rdv";
import { RdvManager } from "./rdv-manager";

// Code privé fictif d'un rendez-vous (lien du visiteur).
const GUEST_LINK_CODE = "9a8b7c6d-1111-4222-8333-444455556666";
// Jeudi 22 octobre 2026, 10 h à Paris.
const NOW = "2026-10-22T08:00:00Z";
const initial = { enabled: false, durations: [30], hours: DEFAULT_HOURS, exceptions: [] };
const appointment = {
  id: "a1",
  starts_at: "2026-10-23T07:30:00Z", // vendredi 23 octobre, 09:30 à Paris
  ends_at: "2026-10-23T08:00:00Z",
  duration_min: 30,
  guest_first: "Camille",
  guest_last: "Laurent",
  guest_email: "camille@exemple.fr",
  message: "Bonjour",
};

// Petit « utilisateur » pour ces tests : clic et saisie, sans dépendance supplémentaire.
const user = {
  click: async (element: HTMLElement) => void fireEvent.click(element),
  type: async (element: HTMLElement, value: string) => void fireEvent.change(element, { target: { value } }),
  clear: async (element: HTMLElement) => void fireEvent.change(element, { target: { value: "" } }),
};

const setup = (over: Partial<Parameters<typeof RdvManager>[0]> = {}) =>
  render(<RdvManager username="claire" nowIso={NOW} initial={initial} appointments={[]} {...over} />);
// « Reporter » est dans le menu « ⋯ » du rendez-vous.
const openReschedule = async () => {
  await user.click(screen.getByRole("button", { name: "Autres actions pour le rendez-vous de Camille Laurent" }));
  await user.click(await screen.findByRole("menuitem", { name: "Reporter" }));
};
// Les réglages sont dans l'onglet de page « Disponibilités ».
const openAvailability = async () => user.click(screen.getByRole("tab", { name: "Disponibilités" }));

beforeEach(() => {
  vi.clearAllMocks();
  for (const m of Object.values(mocks)) m.mockResolvedValue({ ok: true });
});

describe("RdvManager", () => {
  it("explique que la réservation est désactivée, puis l'active et enregistre les réglages", async () => {
    setup();
    await openAvailability();
    expect(screen.getByText(/Fermées/)).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Réservations ouvertes" }));
    expect(screen.getByText(/L'onglet « Rendez-vous » est visible/)).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "60 min" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(mocks.saveSettings).toHaveBeenCalledTimes(1));
    expect(mocks.saveSettings).toHaveBeenCalledWith({ enabled: true, durations: [30, 60], hours: DEFAULT_HOURS });
    expect(await screen.findByRole("status")).toHaveTextContent("Enregistré.");
  });

  it("affiche le message de la base quand l'enregistrement échoue", async () => {
    mocks.saveSettings.mockResolvedValue({ ok: false, error: "Une plage doit finir après son début." });
    setup();
    await openAvailability();
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Une plage doit finir après son début.");
  });

  it("ouvre un jour, ajoute et retire des plages, puis le jour redevient fermé", async () => {
    setup({ initial: { ...initial, hours: [] } });
    await openAvailability();
    expect(screen.getAllByText("Fermé")).toHaveLength(7);
    await user.click(screen.getByRole("checkbox", { name: "Lundi" }));
    expect(screen.getAllByLabelText("Lundi : début").map((i) => (i as HTMLInputElement).value)).toEqual(["09:00", "14:00"]);
    await user.click(screen.getByRole("button", { name: "Ajouter une plage le Lundi" }));
    expect(screen.getAllByLabelText("Lundi : début").map((i) => (i as HTMLInputElement).value)).toEqual(["09:00", "14:00", "19:00"]);
    for (let n = 0; n < 3; n++) await user.click(screen.getAllByRole("button", { name: "Retirer la plage de Lundi" })[0]);
    expect(screen.queryByLabelText("Lundi : début")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Lundi" })).not.toBeChecked();
  });

  it("décocher puis recocher un jour retrouve ses plages", async () => {
    setup({ initial: { ...initial, hours: [{ weekday: 2, start: "10:00", end: "11:00" }] } });
    await openAvailability();
    await user.click(screen.getByRole("checkbox", { name: "Mardi" }));
    expect(screen.queryByLabelText("Mardi : début")).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Mardi" }));
    expect(screen.getByLabelText("Mardi : début")).toHaveValue("10:00");
  });

  it("affiche les règles fixes en lecture seule", async () => {
    setup();
    await openAvailability();
    expect(screen.getByText("Préavis minimum").nextSibling).toHaveTextContent("4 h");
    expect(screen.getByText("Réservable jusqu'à").nextSibling).toHaveTextContent("2 mois");
    expect(screen.getByText("Pause après un rendez-vous").nextSibling).toHaveTextContent("Aucune");
  });

  it("copie l'adresse de réservation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    setup();
    await user.click(screen.getByRole("button", { name: "Copier l'adresse de réservation" }));
    expect(await screen.findByText("Adresse copiée")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/claire?onglet=rdv`);
  });

  it("ferme un jour : exception sans horaires", async () => {
    setup();
    await openAvailability();
    await user.click(screen.getByRole("button", { name: "Ajouter une date" }));
    const add = screen.getByRole("button", { name: "Ajouter" });
    expect(add).toBeDisabled();
    await user.type(screen.getByLabelText("Date"), "2026-10-30");
    await user.click(add);
    await waitFor(() => expect(mocks.addException).toHaveBeenCalledWith({ day: "2026-10-30" }));
  });

  it("liste les exceptions et permet de les retirer", async () => {
    setup({
      initial: {
        ...initial,
        exceptions: [
          { id: "e1", day: "2026-10-30", start: null, end: null },
          { id: "e2", day: "2026-11-02", start: "16:00", end: "17:00" },
        ],
      },
    });
    await openAvailability();
    expect(screen.getByText("ven. 30 octobre")).toBeInTheDocument();
    expect(screen.getByText("Indisponible")).toBeInTheDocument();
    expect(screen.getByText("16:00 – 17:00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retirer l'exception du 2026-10-30" }));
    await waitFor(() => expect(mocks.removeException).toHaveBeenCalledWith("e1"));
  });

  it("dit quand il n'y a aucun rendez-vous, dans chaque onglet", async () => {
    setup();
    expect(screen.getByRole("tab", { name: "À venir (0)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Aucun rendez-vous à venir.")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Passés (0)" }));
    expect(await screen.findByText("Aucun rendez-vous passé.")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Annulés (0)" }));
    expect(await screen.findByText("Aucun rendez-vous annulé.")).toBeInTheDocument();
  });

  it("sépare les rendez-vous à venir, passés et annulés", async () => {
    const past = { ...appointment, id: "p1", starts_at: "2026-10-20T07:30:00Z", ends_at: "2026-10-20T08:00:00Z", guest_first: "Alex" };
    const byGuest = { ...appointment, id: "c1", guest_first: "Sam", cancelled_by: "guest" as const };
    const byOwner = { ...appointment, id: "c2", guest_first: "Lou", cancelled_by: "owner" as const };
    setup({ appointments: [appointment], past: [past], cancelled: [byGuest, byOwner] });

    expect(screen.getByRole("tab", { name: "À venir (1)" })).toBeInTheDocument();
    expect(screen.getByText(/Camille Laurent/)).toBeInTheDocument();
    expect(screen.queryByText(/Alex Laurent/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Passés (1)" }));
    expect(await screen.findByText(/mardi 20 octobre 2026 à 09:30/)).toBeInTheDocument();
    expect(screen.getByText(/Alex Laurent/)).toBeInTheDocument();
    // Un rendez-vous passé ne se reporte ni ne s'annule.
    expect(screen.queryByRole("button", { name: "Reporter" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Annulés (2)" }));
    expect(await screen.findByText("Annulé par le visiteur")).toBeInTheDocument();
    expect(screen.getByText("Annulé par toi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
  });

  it("montre d'emblée qui contacte, puis la fiche détaillée depuis le menu ⋯", async () => {
    const detailed = {
      ...appointment,
      token: GUEST_LINK_CODE,
      created_at: "2026-10-17T09:00:00Z",
      guest_role: "recruiter",
      reason: "job",
      guest_company: "Talentis",
    };
    setup({ appointments: [detailed] });
    expect(screen.getByText("Recruteur · Talentis · Offre d'emploi")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Autres actions pour le rendez-vous de Camille Laurent" }));
    await user.click(await screen.findByRole("menuitem", { name: "Détails" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Camille Laurent" })).toBeInTheDocument();
    expect(within(dialog).getByText("Confirmé")).toBeInTheDocument();
    expect(within(dialog).getByText("09:30 – 10:00 · Visio · Heure de Paris")).toBeInTheDocument();
    expect(within(dialog).getByText("Fonction").nextSibling).toHaveTextContent("Recruteur");
    expect(within(dialog).getByText("Entreprise").nextSibling).toHaveTextContent("Talentis");
    expect(within(dialog).getByText("Réservé le").nextSibling).toHaveTextContent("Samedi 17 octobre 2026");
    expect(within(dialog).getByText("Référence").nextSibling).toHaveTextContent(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(within(dialog).getByText("Bonjour")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Rejoindre" })).toBeDisabled();

    // Annuler depuis la fiche passe par la même confirmation que la liste.
    await user.click(within(dialog).getByRole("button", { name: "Annuler le rendez-vous" }));
    expect(mocks.ownerCancel).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Confirmer l'annulation" }));
    await waitFor(() => expect(mocks.ownerCancel).toHaveBeenCalledWith("a1"));
  });

  it("n'affiche rien de plus pour un ancien rendez-vous sans rôle ni motif", () => {
    setup({ appointments: [appointment] });
    expect(screen.queryByText(/·.*·/, { selector: "p.text-xs" })).not.toBeInTheDocument();
  });

  it("montre « Rejoindre » grisé avant la fenêtre d’ouverture", () => {
    setup({ appointments: [appointment] });
    expect(screen.getByRole("button", { name: "Rejoindre" })).toBeDisabled();
    expect(screen.getByText("Ouvre 10 min avant")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reporter" })).not.toBeInTheDocument();
  });

  it("permet de rejoindre dans la liste et dans la fiche, dès 10 min avant", async () => {
    setup({ appointments: [appointment], nowIso: "2026-10-23T07:20:00Z" });
    const href = `/dashboard/rendez-vous/${appointment.id}/visio`;
    expect(screen.getByRole("link", { name: "Rejoindre" })).toHaveAttribute("href", href);
    await user.click(screen.getByRole("button", { name: "Autres actions pour le rendez-vous de Camille Laurent" }));
    await user.click(await screen.findByRole("menuitem", { name: "Détails" }));
    expect(within(await screen.findByRole("dialog")).getByRole("link", { name: "Rejoindre" })).toHaveAttribute("href", href);
  });

  it("désactive l'accès exactement à la fin", () => {
    setup({ appointments: [appointment], nowIso: appointment.ends_at });
    expect(screen.getByRole("button", { name: "Rejoindre" })).toBeDisabled();
    expect(screen.getByText("Rendez-vous terminé")).toBeInTheDocument();
  });

  it("annule un rendez-vous après confirmation", async () => {
    setup({ appointments: [appointment] });
    expect(screen.getByText(/vendredi 23 octobre 2026 à 09:30 · 30 min/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "camille@exemple.fr" })).toHaveAttribute("href", "mailto:camille@exemple.fr");
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(mocks.ownerCancel).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmer l'annulation" }));
    await waitFor(() => expect(mocks.ownerCancel).toHaveBeenCalledWith("a1"));
  });

  it("reporte un rendez-vous sur un créneau libre d'un autre jour", async () => {
    setup({ appointments: [appointment] });
    await openReschedule();
    const picker = screen.getByLabelText(/Nouveau jour/).closest("div")!.parentElement!;
    await user.clear(screen.getByLabelText(/Nouveau jour/));
    await user.type(screen.getByLabelText(/Nouveau jour/), "2026-10-26");
    await user.click(within(picker).getByRole("button", { name: "14:00" }));
    await waitFor(() => expect(mocks.ownerReschedule).toHaveBeenCalledWith("a1", "2026-10-26T13:00:00.000Z"));
  });

  it("ne propose pas l'heure actuelle du rendez-vous comme nouveau créneau", async () => {
    setup({ appointments: [appointment] });
    await openReschedule();
    await user.type(screen.getByLabelText(/Nouveau jour/), "2026-10-23");
    const picker = screen.getByLabelText(/Nouveau jour/).closest("div")!.parentElement!;
    expect(within(picker).queryByRole("button", { name: "09:30" })).not.toBeInTheDocument();
    expect(within(picker).getByRole("button", { name: "10:00" })).toBeInTheDocument();
  });

  it("montre l'erreur renvoyée si l'annulation échoue", async () => {
    mocks.ownerCancel.mockResolvedValue({ ok: false, error: "Ce créneau n'est plus disponible." });
    setup({ appointments: [appointment] });
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    await user.click(screen.getByRole("button", { name: "Confirmer l'annulation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ce créneau n'est plus disponible.");
  });
});
