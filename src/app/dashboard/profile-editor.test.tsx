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

  it("propose le lien public et sa copie", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ProfileEditor {...props} />);
    expect(screen.getByRole("link", { name: "Voir ma page" })).toHaveAttribute("href", "/remy");
    fireEvent.click(screen.getByRole("button", { name: "Copier le lien" }));
    expect(writeText).toHaveBeenCalledWith("https://mywork.website/remy");
    expect(await screen.findByRole("button", { name: "Lien copié" })).toBeInTheDocument();
  });
});
