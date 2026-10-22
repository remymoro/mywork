import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_HOURS, type RdvConfig } from "@/lib/rdv";

const bookAppointment = vi.fn();

vi.mock("@/app/rdv/actions", () => ({
  bookAppointment: (...args: unknown[]) => bookAppointment(...args),
}));

import { BookingWidget } from "./booking-widget";

// Jeudi 22 octobre 2026 à 10 h (heure de Paris, UTC+2).
const NOW_ISO = "2026-10-22T08:00:00.000Z";

function makeConfig(overrides: Partial<RdvConfig> = {}): RdvConfig {
  return {
    durations: [30, 60],
    hours: DEFAULT_HOURS,
    exceptions: [],
    busy: [],
    ...overrides,
  };
}

describe("BookingWidget", () => {
  beforeEach(() => {
    bookAppointment.mockReset();
  });

  it("affiche uniquement les durées configurées, sélectionne la première par défaut et n'ouvre ni l'étape 3 ni l'étape 4 au départ", () => {
    render(
      <BookingWidget
        username="claire"
        config={makeConfig({ durations: [15, 30, 60] })}
        nowIso={NOW_ISO}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Prendre rendez-vous" })).toBeInTheDocument();

    const group = screen.getByRole("group", { name: "Choisir une durée" });
    const btn15 = within(group).getByRole("button", { name: /15 min.*Point rapide/i });
    const btn30 = within(group).getByRole("button", { name: /30 min.*Échange standard/i });
    const btn60 = within(group).getByRole("button", { name: /60 min.*Session approfondie/i });

    expect(btn15).toHaveAttribute("aria-pressed", "true");
    expect(btn30).toHaveAttribute("aria-pressed", "false");
    expect(btn60).toHaveAttribute("aria-pressed", "false");

    // Aucun jour sélectionné au départ : étapes 3 et 4 masquées.
    expect(screen.queryByRole("heading", { name: "Créneau" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Coordonnées" })).not.toBeInTheDocument();
  });

  it("affiche l'état vide quand aucun créneau n'est disponible dans toute la fenêtre", () => {
    render(
      <BookingWidget
        username="claire"
        config={makeConfig({ hours: [] })}
        nowIso={NOW_ISO}
      />,
    );

    expect(screen.getByText("Aucun créneau disponible pour le moment.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Durée" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Jour" })).not.toBeInTheDocument();
  });

  it("gère le calendrier (aria-label, aujourd'hui, navigation dans la fenêtre) et désélectionne un jour devenu sans créneau au changement de durée", () => {
    // Le vendredi 23 octobre n'a qu'une plage de 30 minutes (09:00-09:30) : disponible en 30 min, pas en 60 min.
    const customConfig = makeConfig({
      durations: [30, 60],
      exceptions: [{ day: "2026-10-23", start: "09:00", end: "09:30" }],
    });

    render(<BookingWidget username="claire" config={customConfig} nowIso={NOW_ISO} />);

    // Mois précédent (septembre 2026) hors fenêtre -> désactivé ; mois suivant (novembre 2026) -> activé.
    const prevBtn = screen.getByRole("button", { name: "Mois précédent" });
    const nextBtn = screen.getByRole("button", { name: "Mois suivant" });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    // Aujourd'hui (jeudi 22 octobre) est repéré par aria-current="date".
    const todayBtn = screen.getByRole("button", { name: /jeudi 22 octobre/i });
    expect(todayBtn).toHaveAttribute("aria-current", "date");

    // Samedi 24 octobre est indisponible.
    const satBtn = screen.getByRole("button", { name: /samedi 24 octobre/i });
    expect(satBtn).toBeDisabled();

    // Vendredi 23 octobre a 1 créneau de 30 min, et le lundi 26 octobre a 14 créneaux.
    const mon26 = screen.getByRole("button", { name: "lundi 26 octobre, 14 créneaux" });
    expect(mon26).toBeEnabled();

    const fri23 = screen.getByRole("button", { name: "vendredi 23 octobre, 1 créneau" });
    fireEvent.click(fri23);
    expect(fri23).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Créneau" })).toBeInTheDocument();

    // Passage à 60 min : le vendredi 23 n'a plus aucun créneau -> désélectionné, étape 3 masquée.
    fireEvent.click(screen.getByRole("button", { name: /60 min/i }));
    expect(screen.queryByRole("heading", { name: "Créneau" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /vendredi 23 octobre/i })).toBeDisabled();
  });

  it("affiche les créneaux groupés Matin / Après-midi avec Heure de Paris, valide le formulaire et confirme le rendez-vous", async () => {
    let resolveBooking!: (value: unknown) => void;
    bookAppointment.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBooking = resolve;
        }),
    );

    render(<BookingWidget username="claire" config={makeConfig()} nowIso={NOW_ISO} />);

    // Étape 2 : clic sur vendredi 23 octobre (14 créneaux).
    fireEvent.click(screen.getByRole("button", { name: "vendredi 23 octobre, 14 créneaux" }));

    // Étape 3 : mention Heure de Paris, groupes Matin et Après-midi.
    expect(screen.getByText("Heure de Paris")).toBeInTheDocument();
    expect(screen.getByText("Matin")).toBeInTheDocument();
    expect(screen.getByText("Après-midi")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "09:30" }));

    // Étape 4 visible avec récapitulatif et champ piège.
    expect(screen.getByRole("heading", { name: "Coordonnées" })).toBeInTheDocument();
    expect(screen.getByText(/vendredi 23 octobre 2026/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: "Confirmer le rendez-vous" });

    // Validation avant envoi : soumission à vide.
    fireEvent.click(submitBtn);
    expect(bookAppointment).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Prénom")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Nom")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");

    // Saisie valide.
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Camille" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Laurent" } });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "camille.laurent@exemple.fr" },
    });
    fireEvent.change(screen.getByLabelText(/Message/i), {
      target: { value: "À vendredi !" },
    });

    fireEvent.click(submitBtn);
    expect(screen.getByRole("button", { name: "Envoi…" })).toBeDisabled();

    expect(bookAppointment).toHaveBeenCalledWith({
      username: "claire",
      start: "2026-10-23T07:30:00.000Z",
      duration: 30,
      first: "Camille",
      last: "Laurent",
      email: "camille.laurent@exemple.fr",
      message: "À vendredi !",
      website: "",
    });

    resolveBooking({
      ok: true,
      appointment: {
        token: "11111111-2222-3333-4444-555555555555",
        starts_at: "2026-10-23T07:30:00.000Z",
        duration_min: 30,
        owner_name: "Claire Moreau",
      },
    });

    expect(await screen.findByRole("heading", { name: "Rendez-vous confirmé" })).toBeInTheDocument();
    expect(screen.getByText("Un e-mail de confirmation vient de t'être envoyé.")).toBeInTheDocument();
    expect(screen.getByText("Claire Moreau")).toBeInTheDocument();
    expect(screen.getByText("09:30 (Heure de Paris)")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();

    const manageLink = screen.getByRole("link", {
      name: "Gérer mon rendez-vous (reporter ou annuler)",
    });
    expect(manageLink).toHaveAttribute("href", "/rdv/11111111-2222-3333-4444-555555555555");
  });

  it("retire le créneau pris, affiche l'alerte et revient à l'étape 3 quand slotTaken vaut true", async () => {
    bookAppointment.mockResolvedValue({
      ok: false,
      slotTaken: true,
      error: "Ce créneau vient d'être pris. Choisis-en un autre.",
    });

    render(<BookingWidget username="claire" config={makeConfig()} nowIso={NOW_ISO} />);

    fireEvent.click(screen.getByRole("button", { name: "vendredi 23 octobre, 14 créneaux" }));
    fireEvent.click(screen.getByRole("button", { name: "09:30" }));

    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Camille" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Laurent" } });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "camille.laurent@exemple.fr" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmer le rendez-vous" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Ce créneau vient d'être pris. Choisis-en un autre.");

    // Retour à l'étape 3 : l'étape 4 est refermée et le créneau 09:30 n'est plus proposé.
    expect(screen.queryByRole("heading", { name: "Coordonnées" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "09:30" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument();
  });

  it("affiche une erreur serveur générique sans perdre la saisie", async () => {
    bookAppointment.mockResolvedValue({
      ok: false,
      error: "Trop de réservations avec cette adresse pour le moment. Réessaie plus tard.",
    });

    render(<BookingWidget username="claire" config={makeConfig()} nowIso={NOW_ISO} />);

    fireEvent.click(screen.getByRole("button", { name: "vendredi 23 octobre, 14 créneaux" }));
    fireEvent.click(screen.getByRole("button", { name: "14:00" }));

    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Camille" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Laurent" } });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "camille.laurent@exemple.fr" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmer le rendez-vous" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Trop de réservations avec cette adresse pour le moment. Réessaie plus tard.",
      );
    });

    // La saisie est conservée à l'étape 4.
    expect(screen.getByLabelText("Prénom")).toHaveValue("Camille");
    expect(screen.getByLabelText("Nom")).toHaveValue("Laurent");
    expect(screen.getByLabelText("E-mail")).toHaveValue("camille.laurent@exemple.fr");
  });
});
