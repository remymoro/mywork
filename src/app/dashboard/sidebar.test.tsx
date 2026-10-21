import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ signOut: vi.fn() }));
vi.mock("./profile-actions", () => ({ setProfileOnline: vi.fn() }));

import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  it("marque la page active, liste les modules à venir et affiche le menu utilisateur", () => {
    render(<Sidebar active="accueil" email="remy@example.com" username="remy" isOnline />);
    expect(screen.getByRole("link", { name: "Tableau de bord" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Profil public" })).not.toHaveAttribute("aria-current");
    for (const name of ["CV", "Rendez-vous", "Boards", "Fichiers", "Visio"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Bientôt").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByRole("button", { name: "remy@example.com" })).toBeInTheDocument();
  });

  it("marque le profil public comme actif sur sa page", () => {
    render(<Sidebar active="profil" email="remy@example.com" username="remy" isOnline={false} />);
    expect(screen.getByRole("link", { name: "Profil public" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
