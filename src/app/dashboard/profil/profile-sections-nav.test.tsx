import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PROFILE_SECTIONS, ProfileSectionsNav, type ProfileSectionId } from "./profile-sections-nav";

const sections = Object.fromEntries(
  PROFILE_SECTIONS.map(({ id, label }) => [id, <p key={id}>Champs : {label}</p>]),
) as Record<ProfileSectionId, React.ReactNode>;

describe("ProfileSectionsNav", () => {
  it("liste les sections à gauche, les affiche toutes et fait défiler jusqu'à celle choisie", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<ProfileSectionsNav sections={sections} username="remy" />);
    expect(screen.getByRole("navigation", { name: "Sections du profil" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(PROFILE_SECTIONS.length);
    const publicLink = screen.getByRole("link", { name: "Voir mon profil public" });
    expect(publicLink).toHaveAttribute("href", "/remy");
    expect(publicLink).toHaveAttribute("target", "_blank");

    // Toutes les sections sont affichées, dans l'ordre du menu.
    for (const { label } of PROFILE_SECTIONS) {
      expect(screen.getByText(`Champs : ${label}`)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Éditer mon profil" })).toHaveAttribute("aria-current", "true");

    fireEvent.click(screen.getByRole("button", { name: "Expérience" }));
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole("region", { name: "Expérience" }));
    expect(screen.getByRole("button", { name: "Expérience" })).toHaveAttribute("aria-current", "true");
  });

});

describe("ProfileSectionsNav — mise en forme", () => {
  it("met « Ordre des sections » en gras", () => {
    render(<ProfileSectionsNav sections={sections} username="remy" />);
    expect(screen.getByRole("button", { name: "Ordre des sections" })).toHaveClass("font-bold");
    expect(screen.getByRole("button", { name: "Photo" })).not.toHaveClass("font-bold");
  });
});
