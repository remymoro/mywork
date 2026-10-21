import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MODE_STORAGE_KEY, THEME_STORAGE_KEY } from "@/lib/appearance";

vi.mock("./actions", () => ({ signOut: vi.fn() }));

import { UserMenu } from "./user-menu";

describe("UserMenu", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("data-theme", "editorial");
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  it("affiche les initiales et ouvre le menu avec les options de thème et d'apparence", () => {
    render(<UserMenu userName="Rémy Moro" />);
    expect(screen.getByText("RM")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rémy Moro" }));

    expect(screen.getByText("Thème de la page")).toBeInTheDocument();
    expect(screen.getByText("Apparence")).toBeInTheDocument();
    expect(screen.getByText("Mon compte")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Se déconnecter" })).toBeInTheDocument();
  });

  it("applique le thème choisi sur <html> et dans localStorage", () => {
    render(<UserMenu userName="Rémy Moro" />);
    fireEvent.click(screen.getByRole("button", { name: "Rémy Moro" }));

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Bleu Ardoise" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "blue");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("blue");
  });

  it("bascule en mode sombre puis clair sur <html> et dans localStorage", () => {
    render(<UserMenu userName="Rémy Moro" />);
    fireEvent.click(screen.getByRole("button", { name: "Rémy Moro" }));

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Sombre" }));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("dark");

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Clair" }));
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("light");
  });
});
