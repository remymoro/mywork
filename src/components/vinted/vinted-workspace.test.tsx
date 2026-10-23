import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  advanceItem: vi.fn(),
  backItem: vi.fn(),
  cancelSale: vi.fn(),
  createItem: vi.fn(),
  deleteItem: vi.fn(),
  updateItem: vi.fn(),
}));
const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/dashboard/vinted/actions", () => actions);

import { VintedWorkspace } from "./vinted-workspace";
import type { VintedItem } from "@/lib/vinted";

// Jeudi 23 octobre 2026, midi à Paris.
const NOW = "2026-10-23T10:00:00.000Z";

function item(patch: Partial<VintedItem> = {}): VintedItem {
  return {
    id: "11111111-1111-4111-8111-111111111111", ownerId: "u1", title: "Veste en jean", brand: "Sézane",
    size: "M", condition: "tres_bon_etat", purchasePriceCents: 3500, listingPriceCents: 8500,
    salePriceCents: null, buyer: null, carrier: null, trackingNumber: null, notes: null, status: "en_vente",
    listedAt: "2026-10-14T10:00:00.000Z", soldAt: null, shippedAt: null, deliveredAt: null, completedAt: null,
    createdAt: "2026-10-12T10:00:00.000Z", updatedAt: "2026-10-20T10:00:00.000Z", ...patch,
  };
}

const items: VintedItem[] = [
  item(),
  item({ id: "22222222-2222-4222-8222-222222222222", title: "Écharpe en laine", brand: "Acne", status: "vendu",
    salePriceCents: 6500, purchasePriceCents: 3000, soldAt: "2026-10-12T10:00:00.000Z", updatedAt: "2026-10-21T10:00:00.000Z" }),
  item({ id: "33333333-3333-4333-8333-333333333333", title: "Jean 501", brand: "Levi's", status: "livre",
    salePriceCents: 4200, carrier: "mondial_relay", soldAt: "2026-10-15T10:00:00.000Z",
    deliveredAt: "2026-10-22T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z" }),
];

const renderPage = (list = items, stage: string | null = null) =>
  render(<VintedWorkspace items={list} stage={stage} now={NOW} />);

beforeEach(() => {
  vi.clearAllMocks();
  for (const action of Object.values(actions)) action.mockResolvedValue({ saved: true });
});

describe("VintedWorkspace", () => {
  it("affiche les chiffres, les étapes et les échéances", () => {
    renderPage();
    const kpi = within(screen.getByRole("region", { name: "Indicateurs du mois" }));
    expect(kpi.getByText("1 article")).toBeInTheDocument();
    expect(kpi.getByText("dont 1 en retard")).toBeInTheDocument();
    expect(screen.getByText(/En retard · À expédier avant le/)).toBeInTheDocument();
    expect(screen.getByText(/Argent dispo vers le/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tous/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /À expédier/ })).toHaveAttribute("href", "/dashboard/vinted?etape=a-expedier");
  });

  it("filtre par étape et par recherche sans accents", () => {
    renderPage(items, "a-expedier");
    expect(screen.getByText("Écharpe en laine")).toBeInTheDocument();
    expect(screen.queryByText("Veste en jean")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Rechercher par titre ou marque"), { target: { value: "echarpe" } });
    expect(screen.getByText("Écharpe en laine")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Rechercher par titre ou marque"), { target: { value: "zzz" } });
    expect(screen.getByText("Aucun article ici.")).toBeInTheDocument();
  });

  it("affiche l'écran vide", () => {
    renderPage([]);
    expect(screen.getByText("Aucun article pour l'instant. Ajoute ton premier article.")).toBeInTheDocument();
  });

  it("ouvre la fiche avec la raison quand l'étape suivante est bloquée", () => {
    renderPage([item()]);
    fireEvent.click(screen.getByRole("button", { name: "Étape suivante" }));
    expect(actions.advanceItem).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("Indique le prix de vente");
  });

  it("enregistre la fiche puis avance d'une étape", async () => {
    renderPage([item()]);
    fireEvent.click(screen.getByRole("button", { name: "Veste en jean" }));
    fireEvent.change(screen.getByLabelText("Prix de vente (€)"), { target: { value: "78,00" } });
    fireEvent.click(screen.getByRole("button", { name: /Étape suivante · À expédier/ }));
    await waitFor(() => expect(actions.advanceItem).toHaveBeenCalledWith(items[0].id));
    const formData = actions.updateItem.mock.calls[0][1] as FormData;
    expect(formData.get("salePrice")).toBe("78,00");
    expect(refresh).toHaveBeenCalled();
  });

  it("crée un article et affiche les erreurs du serveur", async () => {
    actions.createItem.mockResolvedValueOnce({ error: "500 articles au maximum : supprime un article avant d'en ajouter un." });
    renderPage([]);
    fireEvent.click(screen.getAllByRole("button", { name: "Ajouter un article" })[0]);
    fireEvent.change(screen.getByLabelText("Titre de l'article *"), { target: { value: "Pull marin" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText(/500 articles au maximum/)).toBeInTheDocument();
    expect((actions.createItem.mock.calls[0][0] as FormData).get("title")).toBe("Pull marin");
  });

  it("demande une confirmation avant de supprimer", async () => {
    renderPage([item()]);
    fireEvent.click(screen.getByRole("button", { name: "Veste en jean" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(actions.deleteItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmer la suppression" }));
    await waitFor(() => expect(actions.deleteItem).toHaveBeenCalledWith(items[0].id));
  });
});
