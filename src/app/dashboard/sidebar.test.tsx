import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  it("marque la page active et liste les modules à venir", () => {
    render(<Sidebar active="accueil" />);
    expect(screen.getByRole("link", { name: "Tableau de bord" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Profil public" })).not.toHaveAttribute("aria-current");
    for (const name of ["CV", "Rendez-vous", "Boards", "Fichiers", "Visio"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Bientôt").length).toBeGreaterThanOrEqual(5);
  });

  it("marque le profil public comme actif sur sa page", () => {
    render(<Sidebar active="profil" />);
    expect(screen.getByRole("link", { name: "Profil public" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
