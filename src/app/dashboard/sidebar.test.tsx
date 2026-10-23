import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ signOut: vi.fn() }));
vi.mock("./profile-actions", () => ({ setProfileOnline: vi.fn() }));

import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  it("marque la page active, liste les modules et affiche le menu utilisateur", () => {
    render(<Sidebar active="accueil" email="remy@example.com" displayName="Rémy Moro" username="remy" isOnline />);
    expect(screen.getByRole("link", { name: "Mon tableau de bord" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Mon profil" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByText("CV")).not.toBeInTheDocument();
    for (const name of ["Kanban", "Rendez-vous", "Fichiers", "Vinted"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    // La visio fait partie des rendez-vous : plus de section « Bientôt ».
    expect(screen.queryByText("Bientôt")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kanban" })).toHaveAttribute("href", "/dashboard/kanban");
    expect(screen.getByRole("link", { name: "Fichiers" })).toHaveAttribute("href", "/dashboard/fichiers");
    expect(screen.getByRole("link", { name: "Rendez-vous" })).toHaveAttribute("href", "/dashboard/rendez-vous");
    expect(screen.getByRole("link", { name: "Vinted" })).toHaveAttribute("href", "/dashboard/vinted");
    expect(screen.getByRole("button", { name: "Rémy Moro" })).toBeInTheDocument();
  });

  it("marque Mon profil comme actif sur sa page", () => {
    render(<Sidebar active="profil" email="remy@example.com" displayName="Rémy Moro" username="remy" isOnline={false} />);
    expect(screen.getByRole("link", { name: "Mon profil" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it.each([
    ["accueil", "Mon tableau de bord"],
    ["profil", "Mon profil"],
    ["kanban", "Kanban"],
    ["rdv", "Rendez-vous"],
    ["fichiers", "Fichiers"],
    ["vinted", "Vinted"],
  ] as const)("affiche l'entrée active %s en bloc carmin", (active, name) => {
    render(<Sidebar active={active} email="remy@example.com" displayName="Rémy" username="remy" isOnline />);
    expect(screen.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name })).toHaveClass("bg-primary", "text-primary-foreground", "rounded-md");
  });
});
