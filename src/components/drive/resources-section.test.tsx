import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResourcesSection } from "./resources-section";

describe("ResourcesSection", () => {
  it("dit qu'il n'y a aucun fichier à télécharger quand il n'y en a pas", () => {
    render(<ResourcesSection username="remy" items={[]} />);
    expect(screen.getByRole("heading", { name: "Documents en libre accès" })).toBeInTheDocument();
    expect(screen.getByText("Aucun fichier à télécharger pour le moment.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Télécharger/ })).not.toBeInTheDocument();
  });

  it("liste les fichiers avec un lien de téléchargement par l'application", () => {
    render(
      <ResourcesSection
        username="remy"
        items={[{ id: "f1", name: "CV-2026.pdf", size_bytes: 1468006, updated_at: "2026-10-22T10:00:00Z" }]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Documents en libre accès" })).toBeInTheDocument();
    expect(screen.getByText("Fichier & informations")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText(/PDF · 1,4 Mo/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Télécharger CV-2026.pdf" })).toHaveAttribute(
      "href",
      "/remy/ressources/f1",
    );
  });
});
