import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MODE_STORAGE_KEY } from "@/lib/appearance";

const setProfileOnline = vi.fn().mockResolvedValue({});

vi.mock("./actions", () => ({ signOut: vi.fn() }));
vi.mock("./profile-actions", () => ({
  setProfileOnline: (...args: unknown[]) => setProfileOnline(...args),
}));

import { UserMenu } from "./user-menu";

const defaultProps = {
  email: "remy@example.com",
  displayName: "Rémy Moro",
  username: "remy",
  isOnline: true,
};

describe("UserMenu", () => {
  it("affiche le pseudo quand il n'y a pas de nom affiché", () => {
    render(<UserMenu {...defaultProps} displayName={null} />);
    expect(screen.getByRole("button", { name: "remy" })).toBeInTheDocument();
  });

  beforeEach(() => {
    document.documentElement.setAttribute("data-theme", "editorial");
    document.documentElement.classList.remove("dark");
    localStorage.clear();
    setProfileOnline.mockClear();
    setProfileOnline.mockResolvedValue({});
  });

  it("affiche les initiales et le nom affiché, puis l'e-mail dans le menu", () => {
    render(<UserMenu {...defaultProps} />);
    expect(screen.getByText("RM")).toBeInTheDocument();
    expect(screen.queryByText("remy@example.com")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rémy Moro" }));

    expect(screen.getByText("remy@example.com")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Mon profil public" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Thème" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Se déconnecter" })).toBeInTheDocument();
    expect(screen.queryByText("Mon compte")).not.toBeInTheDocument();
  });

  it("ouvre le sous-menu Mon profil public et appelle setProfileOnline à la bascule du switch", () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Rémy Moro" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Mon profil public" }));

    const toggle = screen.getByRole("switch", { name: "Profil en ligne" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitem", { name: "Ouvrir mon profil public" })).toHaveAttribute(
      "href",
      "/remy",
    );

    fireEvent.click(toggle);
    expect(setProfileOnline).toHaveBeenCalledWith(false);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("copie l'adresse du profil public dans le presse-papiers", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Rémy Moro" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Mon profil public" }));

    fireEvent.click(screen.getByRole("menuitem", { name: "Copier l'adresse" }));
    expect(writeText).toHaveBeenCalledWith("https://mywork.website/remy");
    expect(await screen.findByRole("menuitem", { name: "Adresse copiée" })).toBeInTheDocument();
  });

  it("ne propose que Clair et Sombre dans le sous-menu Thème", () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Rémy Moro" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Thème" }));

    const choices = screen.getAllByRole("menuitemradio").map((item) => item.textContent);
    expect(choices).toEqual(["Clair", "Sombre"]);
    expect(screen.getByRole("menuitemradio", { name: "Clair" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("bascule en mode sombre puis clair sur <html> et dans localStorage via le sous-menu Thème", () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Rémy Moro" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Thème" }));

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Sombre" }));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("dark");

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Clair" }));
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "editorial");
  });
});
