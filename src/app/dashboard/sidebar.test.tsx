import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ signOut: vi.fn() }));
vi.mock("./profile-actions", () => ({ setProfileOnline: vi.fn() }));

import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  it("marque la page active, liste les modules à venir et affiche le menu utilisateur", () => {
    render(<Sidebar active="accueil" email="remy@example.com" displayName="Rémy Moro" username="remy" isOnline />);
    expect(screen.getByRole("link", { name: "Mon tableau de bord" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Mon profil" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByText("CV")).not.toBeInTheDocument();
    for (const name of ["Kanban", "Rendez-vous", "Fichiers", "Visio"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Bientôt").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole("button", { name: "Rémy Moro" })).toBeInTheDocument();
  });

  it("marque Mon profil comme actif sur sa page", () => {
    render(<Sidebar active="profil" email="remy@example.com" displayName="Rémy Moro" username="remy" isOnline={false} />);
    expect(screen.getByRole("link", { name: "Mon profil" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
