import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PROFILE_SECTIONS, ProfileSectionsNav, type ProfileSectionId } from "./profile-sections-nav";

const sections = Object.fromEntries(
  PROFILE_SECTIONS.map(({ id, label }) => [id, <p key={id}>Champs : {label}</p>]),
) as Record<ProfileSectionId, React.ReactNode>;

describe("ProfileSectionsNav", () => {
  it("liste les sections à gauche et n'affiche que celle choisie", () => {
    render(<ProfileSectionsNav sections={sections} username="remy" />);
    const nav = screen.getByRole("navigation", { name: "Sections du profil" });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(PROFILE_SECTIONS.length);
    const publicLink = screen.getByRole("link", { name: "Voir mon profil public" });
    expect(publicLink).toHaveAttribute("href", "/remy");
    expect(publicLink).toHaveAttribute("target", "_blank");

    expect(screen.getByRole("button", { name: "Éditer mon profil" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("Champs : Éditer mon profil")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expérience" }));
    expect(screen.getByText("Champs : Expérience")).toBeInTheDocument();
    expect(screen.queryByText("Champs : Éditer mon profil")).not.toBeInTheDocument();
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
