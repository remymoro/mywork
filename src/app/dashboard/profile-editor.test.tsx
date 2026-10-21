import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./profile-actions", () => ({ updateProfile: vi.fn() }));

import { ProfileEditor } from "./profile-editor";

describe("ProfileEditor", () => {
  const props = { username: "remy", displayName: "Rémy Moro", headline: "Consultant" };

  it("pré-remplit le formulaire et l'aperçu", () => {
    render(<ProfileEditor {...props} />);
    expect(screen.getByLabelText("Nom affiché")).toHaveValue("Rémy Moro");
    expect(screen.getByTestId("preview-name")).toHaveTextContent("Rémy Moro");
    expect(screen.getByTestId("preview-headline")).toHaveTextContent("Consultant");
  });

  it("met l'aperçu à jour en direct", () => {
    render(<ProfileEditor {...props} />);
    fireEvent.change(screen.getByLabelText("Nom affiché"), { target: { value: "Remy M." } });
    fireEvent.change(screen.getByLabelText("Titre"), { target: { value: "" } });
    expect(screen.getByTestId("preview-name")).toHaveTextContent("Remy M.");
    expect(screen.queryByTestId("preview-headline")).not.toBeInTheDocument();
  });

  it("affiche le pseudo si le nom est vide", () => {
    render(<ProfileEditor {...props} displayName="" />);
    expect(screen.getByTestId("preview-name")).toHaveTextContent("remy");
  });

  it("n'affiche plus le bandeau d'adresse publique (lien déplacé dans le menu des sections)", () => {
    render(<ProfileEditor {...props} />);
    expect(screen.queryByRole("button", { name: "Copier le lien" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Voir ma page" })).not.toBeInTheDocument();
  });
});
