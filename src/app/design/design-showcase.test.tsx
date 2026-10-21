import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DesignShowcase } from "./design-showcase";

function renderShowcase() {
  return render(<DesignShowcase patterns={<p>Aperçus de page</p>} />);
}

describe("Système de design", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("data-theme", "editorial");
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  it("garde le système retenu quand une autre palette d'archives est sélectionnée", () => {
    renderShowcase();
    const current = screen.getByTestId("design-current-system");
    expect(within(current).getByRole("heading", { name: "Système retenu : Éditorial" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(4);

    fireEvent.click(screen.getByRole("tab", { name: /Bleu Ardoise/ }));
    expect(screen.getByTestId("design-demo-container")).toHaveAttribute("data-theme", "blue");
    expect(current).toHaveAttribute("data-theme", "editorial");
    expect(document.documentElement).toHaveAttribute("data-theme", "editorial");
    expect(screen.getByText("Logo retenu", { exact: true })).toBeInTheDocument();
  });

  it("synchronise le mode de la page et celui du sous-menu utilisateur", async () => {
    renderShowcase();
    const toggle = screen.getByRole("switch", { name: "Afficher le système retenu en mode sombre" });
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("mywork-mode")).toBe("dark");
    expect(screen.getByTestId("design-demo-container")).toHaveClass("dark");

    fireEvent.click(screen.getByRole("button", { name: "Camille Martin" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Thème" }));
    expect(screen.getByRole("menuitemradio", { name: "Sombre" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Clair" }));
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"));
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem("mywork-mode")).toBe("light");
  });

  it("modifie, masque, déplace et supprime uniquement les éléments de démonstration", async () => {
    renderShowcase();
    const list = screen.getByRole("list", { name: "Expériences de démonstration" });
    const first = within(list).getAllByRole("listitem")[0];
    expect(within(first).getByRole("button", { name: "Monter" })).toBeDisabled();

    fireEvent.click(within(first).getByRole("button", { name: "Masquer" }));
    expect(within(first).getByText("Masqué")).toBeInTheDocument();
    fireEvent.click(within(first).getByRole("button", { name: "Modifier" }));
    fireEvent.change(within(first).getByLabelText("Poste", { exact: true }), { target: { value: "Designer produit" } });
    fireEvent.click(within(first).getByRole("button", { name: "Enregistrer l’exemple" }));
    expect(first).toHaveTextContent("Designer produit");
    fireEvent.click(within(first).getByRole("button", { name: "Descendre" }));
    expect(within(list).getAllByRole("listitem")[1]).toHaveTextContent("Designer produit");

    fireEvent.click(within(first).getByRole("button", { name: "Supprimer" }));
    let dialog = screen.getByRole("dialog", { name: "Supprimer cet élément ?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(within(first).getByRole("button", { name: "Supprimer" }));
    dialog = screen.getByRole("dialog", { name: "Supprimer cet élément ?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmer la suppression" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser la liste" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });
});
