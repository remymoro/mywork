import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PROFILE_SECTIONS, ProfileSectionsNav, type ProfileSectionId } from "./profile-sections-nav";

const sections = Object.fromEntries(
  PROFILE_SECTIONS.map(({ id, label }) => [id, <p key={id}>Champs : {label}</p>]),
) as Record<ProfileSectionId, React.ReactNode>;

function renderNav() {
  return render(
    <ProfileSectionsNav
      sections={sections}
      filled={{ "en-tete": true, coordonnees: true }}
      username="remy"
    />,
  );
}

describe("ProfileSectionsNav", () => {
  it("liste les sections, les affiche toutes et fait défiler jusqu'à celle choisie", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderNav();
    const nav = screen.getByRole("navigation", { name: "Sections du profil" });
    const publicLink = within(nav).getByRole("link", { name: /Voir mon profil public/ });
    expect(publicLink).toHaveAttribute("href", "/remy");
    expect(publicLink).toHaveAttribute("target", "_blank");

    // Toutes les sections sont affichées, dans l'ordre du menu.
    for (const { label } of PROFILE_SECTIONS) {
      expect(screen.getByText(`Champs : ${label}`)).toBeInTheDocument();
    }
    expect(within(nav).getByRole("button", { name: /^En-tête/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("breadcrumb-current")).toHaveTextContent("En-tête");

    fireEvent.click(within(nav).getByRole("button", { name: /^Offre freelance/ }));
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole("region", { name: "Offre freelance" }));
    expect(within(nav).getByRole("button", { name: /^Offre freelance/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("breadcrumb-current")).toHaveTextContent("Offre freelance");
    expect(screen.getByText(/Ces informations seront visibles sur ton profil public/)).toBeInTheDocument();
  });

  it("montre ✓ pour une section remplie et — pour une section vide", () => {
    renderNav();
    const nav = screen.getByRole("navigation", { name: "Sections du profil" });
    expect(within(nav).getByRole("button", { name: "En-tête (remplie)" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Langues (vide)" })).toBeInTheDocument();
  });

  it("met « Ordre des sections » à part, en gras, et le groupe CV en « Bientôt »", () => {
    renderNav();
    expect(screen.getByRole("button", { name: "Ordre des sections" })).toHaveClass("font-bold");
    expect(screen.getByText("Télécharger en PDF")).toBeInTheDocument();
    expect(screen.getAllByText("Bientôt")).toHaveLength(3);
  });
});
