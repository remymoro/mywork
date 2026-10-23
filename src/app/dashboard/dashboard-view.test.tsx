import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDashboardData, type DashboardInput } from "@/lib/dashboard";
import { DashboardView } from "./dashboard-view";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
function input(): DashboardInput {
  return {
    now: Date.parse("2026-10-23T12:00:00Z"), origin: "https://preview.example.test",
    profile: { username: "remy", display_name: "Rémy", is_online: true },
    next: { data: null, error: null }, week: { data: [], count: 0, error: null },
    settings: { data: null, error: null }, experiences: { data: [], error: null }, projects: { data: [], error: null },
    boards: { data: [], error: null }, lists: { data: [], error: null }, cards: { data: [], error: null },
    files: { data: null, count: 0, error: null }, publicFiles: { data: null, count: 0, error: null }, storage: { data: [], error: null },
  };
}
const appointment = {
  id: "rdv-1", status: "confirmed", starts_at: "2026-10-23T12:00:00Z", ends_at: "2026-10-23T12:30:00Z",
  duration_min: 30, guest_first: "Alice", guest_last: "Martin", guest_company: "ACME", guest_role: "client", reason: "mission",
};
const error = { data: null, error: { message: "Ne pas exposer les détails" } };

beforeEach(() => vi.clearAllMocks());

describe("DashboardView", () => {
  it("affiche les cinq blocs et leurs états vides avec les actions", () => {
    render(<DashboardView data={buildDashboardData(input())} />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Prochain rendez-vous", "Cette semaine", "Mon profil public", "Mes tableaux", "Mes fichiers"]);
    expect(screen.getByText("Bonjour Rémy")).toBeInTheDocument();
    for (const text of ["Aucun rendez-vous prévu", "Aucun rendez-vous restant cette semaine", "Réservation désactivée", "Aucun fichier importé"]) expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByText(/Aucun tableau/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gérer mes disponibilités" })).toHaveAttribute("href", "/dashboard/rendez-vous");
    expect(screen.getByRole("link", { name: "Voir mes tableaux" })).toHaveAttribute("href", "/dashboard/kanban");
    expect(screen.getByRole("link", { name: "Gérer mes fichiers" })).toHaveAttribute("href", "/dashboard/fichiers");
    expect(screen.getByRole("progressbar", { name: "Complétude du profil" })).toHaveAttribute("max", "8");
    expect(screen.getByRole("progressbar", { name: "Stockage utilisé" })).toHaveAttribute("value", "0");
  });
  it("affiche les données prêtes et le lien Rejoindre quand il existe", () => {
    const data = buildDashboardData({ ...input(), next: { data: appointment, error: null }, week: { data: [appointment], count: 9, error: null }, settings: { data: { enabled: true }, error: null },
      boards: { data: [{ id: "b1", name: "Mon travail" }], error: null }, cards: { data: [{ id: "c1", board_id: "b1", list_id: "todo" }], error: null },
      files: { data: null, count: 42, error: null }, publicFiles: { data: null, count: 2, error: null }, storage: { data: [{ bucket_id: "avatars", bytes: 1024 }], error: null },
    });
    render(<DashboardView data={data} />);
    const next = within(screen.getByRole("region", { name: "Prochain rendez-vous" }));
    expect(next.getByText("Alice Martin")).toBeInTheDocument();
    expect(next.getByText("ACME")).toBeInTheDocument();
    expect(next.getByText("Client ou prospect · Mission ou projet")).toBeInTheDocument();
    expect(next.getByText(/30 min · En cours/)).toBeInTheDocument();
    expect(next.getByRole("link", { name: "Rejoindre" })).toHaveAttribute("href", "/dashboard/rendez-vous/rdv-1/visio");
    expect(screen.getByText("9 rendez-vous restants cette semaine")).toBeInTheDocument();
    expect(screen.getByText("1 carte — Liste de fin non définie")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ouvrir le tableau" })).toHaveAttribute("href", "/dashboard/kanban?tableau=b1");
    expect(screen.getByText("42 fichiers importés")).toBeInTheDocument();
    expect(screen.getByText("2 fichiers marqués publics")).toBeInTheDocument();
    expect(screen.getByText(/1 Ko utilisés sur 1 Go/)).toBeInTheDocument();
  });
  it("ne propose pas Rejoindre avant ouverture et affiche l'horaire", () => {
    render(<DashboardView data={buildDashboardData({ ...input(), now: Date.parse(appointment.starts_at) - 11 * 60_000, next: { data: appointment, error: null } })} />);
    expect(screen.queryByRole("link", { name: "Rejoindre" })).not.toBeInTheDocument();
    expect(screen.getByText(/Ouvre le .* à 13:50/)).toBeInTheDocument();
  });
  it("affiche les erreurs par bloc et Actualiser relit la route", () => {
    const data = buildDashboardData({ ...input(), next: error, week: error, settings: error, experiences: error, boards: error, files: error });
    render(<DashboardView data={data} />);
    expect(screen.getAllByText("Informations indisponibles")).toHaveLength(6);
    expect(screen.queryByText("Aucun rendez-vous prévu")).not.toBeInTheDocument();
    expect(screen.queryByText("Aucun fichier importé")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Actualiser" })[0]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Compléter mon profil" })).toBeInTheDocument();
    expect(screen.queryByText(/Ne pas exposer/)).not.toBeInTheDocument();
  });
  it("conserve les compteurs si seule la jauge est en erreur", () => {
    render(<DashboardView data={buildDashboardData({ ...input(), files: { data: null, count: 12, error: null }, storage: error })} />);
    expect(screen.getByText("12 fichiers importés")).toBeInTheDocument();
    expect(screen.getByText("Informations indisponibles")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Stockage utilisé" })).not.toBeInTheDocument();
  });
  it("copie l'adresse absolue et confirme Copié", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<DashboardView data={buildDashboardData(input())} />);
    fireEvent.click(screen.getByRole("button", { name: "Copier" }));
    expect(writeText).toHaveBeenCalledWith("https://preview.example.test/remy");
    expect(await screen.findByRole("button", { name: "Copié" })).toBeInTheDocument();
    expect(screen.getByText("Adresse copiée")).toBeInTheDocument();
  });
  it("gère le refus de presse-papiers sans annoncer une copie réussie", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("refus")) }, configurable: true });
    render(<DashboardView data={buildDashboardData(input())} />);
    fireEvent.click(screen.getByRole("button", { name: "Copier" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Copie impossible");
    expect(screen.queryByRole("button", { name: "Copié" })).not.toBeInTheDocument();
  });
  it("hors ligne, permet de copier et d'ouvrir l'aperçu propriétaire en expliquant les restrictions", () => {
    const source = input(); source.profile.is_online = false;
    render(<DashboardView data={buildDashboardData(source)} />);
    expect(screen.getByText(/Profil hors ligne/)).toBeInTheDocument();
    expect(screen.getByText(/actuellement inaccessibles aux visiteurs/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copier" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ouvrir mon aperçu propriétaire" })).toHaveAttribute("href", "https://preview.example.test/remy");
  });
});
