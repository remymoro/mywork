import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const revealContactEmail = vi.fn();

vi.mock("./actions", () => ({
  revealContactEmail: (...args: unknown[]) => revealContactEmail(...args),
}));

import { ContactButton } from "./contact-button";
import {
  AboutSection,
  CertificationSection,
  ExperienceSection,
  FreelanceSection,
  ProjectSection,
  PublicProfileView,
  SkillsSection,
} from "./profile-view";

describe("ContactButton", () => {
  beforeEach(() => {
    revealContactEmail.mockReset();
  });

  it("n'affiche pas l'e-mail avant le clic et l'affiche après", async () => {
    revealContactEmail.mockResolvedValue("contact@mywork.website");

    render(<ContactButton username="remy" />);
    expect(screen.queryByText("contact@mywork.website")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Afficher l'e-mail" }));
    expect(revealContactEmail).toHaveBeenCalledWith("remy");

    const mailLink = await screen.findByRole("link", { name: "contact@mywork.website" });
    expect(mailLink).toHaveAttribute("href", "mailto:contact@mywork.website");
    expect(screen.getByRole("button", { name: "Copier" })).toBeInTheDocument();
  });
});

describe("Sections publiques du profil", () => {
  it("n'affiche pas une section vide", () => {
    const { container } = render(
      <>
        <AboutSection about={null} topSkills={[]} />
        <ExperienceSection items={[]} />
        <SkillsSection skills={[]} />
        <CertificationSection items={[]} />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche les expériences avec durée et compétences", () => {
    render(
      <ExperienceSection
        nowIso="2025-10-01"
        items={[
          {
            id: "1",
            position: 0,
            is_visible: true,
            title: "Développeur Full-Stack",
            company: "MyWork",
            employment_type: "cdi",
            location: "Lyon",
            work_mode: "hybride",
            start_date: "2024-01-01",
            end_date: null,
            is_current: true,
            description: "Architecture et développement",
            skills: ["React", "TypeScript"],
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "EXPÉRIENCE" })).toBeInTheDocument();
    expect(screen.getByText("Développeur Full-Stack")).toBeInTheDocument();
    expect(screen.getByText("MyWork · CDI")).toBeInTheDocument();
    expect(screen.getByText("Lyon · Hybride")).toBeInTheDocument();
    expect(screen.getByText("janv. 2024 – aujourd'hui · 1 an 10 mois")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("rend la vue publique complète sans exposer l'e-mail dans le HTML", () => {
    render(
      <PublicProfileView
        profile={{
          username: "remy",
          is_online: true,
          display_name: "Rémy Moro",
          headline: "Consultant Produit",
          avatar_url: null,
          location: "Lyon, France",
          open_to_work: true,
          open_to_work_details: "Freelance, CDI",
          hasContact: true,
          website_url: "https://mywork.website",
          linkedin_url: null,
          github_url: "https://github.com/remy",
          other_url: null,
          about: "Bonjour\nMon parcours",
          top_skills: ["Produit"],
          skills: [],
        }}
        experiences={[
          {
            id: "e1",
            position: 0,
            is_visible: true,
            title: "Développeur web",
            company: "Ancienne boîte",
            employment_type: null,
            location: null,
            work_mode: null,
            start_date: "2020-01-01",
            end_date: "2022-01-01",
            is_current: false,
            description: null,
            skills: [],
          },
          {
            id: "e2",
            position: 1,
            is_visible: true,
            title: "Développeur full-stack",
            company: "MyWork",
            employment_type: null,
            location: null,
            work_mode: null,
            start_date: "2024-01-01",
            end_date: null,
            is_current: true,
            description: null,
            skills: [],
          },
        ]}
        educations={[]}
        languages={[{ id: "l1", position: 0, is_visible: true, name: "Français", level: "maternelle" }]}
        certifications={[]}
        projects={[]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Rémy Moro" })).toBeInTheDocument();
    const position = screen.getByText("Développeur full-stack · MyWork");
    // Le poste actuel est placé au-dessus du nom.
    expect(
      position.compareDocumentPosition(screen.getByRole("heading", { name: "Rémy Moro" })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText("Développeur web · Ancienne boîte")).not.toBeInTheDocument();
    expect(screen.getByText("Lyon, France")).toBeInTheDocument();
    expect(screen.getByText("Ouvert aux opportunités : Freelance, CDI")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Afficher l'e-mail" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "À PROPOS" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "LANGUES" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "FORMATION" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "COMPÉTENCES" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Ton profil est hors ligne/)).not.toBeInTheDocument();
  });

  it("prévient le propriétaire quand son profil est hors ligne", () => {
    render(
      <PublicProfileView
        profile={{
          username: "remy",
          is_online: false,
          display_name: null,
          headline: null,
          avatar_url: null,
          location: null,
          open_to_work: false,
          open_to_work_details: null,
          hasContact: false,
          website_url: null,
          linkedin_url: null,
          github_url: null,
          other_url: null,
          about: null,
          top_skills: [],
          skills: [],
        }}
        experiences={[]}
        educations={[]}
        languages={[]}
        certifications={[]}
        projects={[]}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Ton profil est hors ligne");
  });

  it("affiche l'image d'un projet quand il en a une", () => {
    const base = {
      position: 0,
      is_visible: true,
      start_date: null,
      end_date: null,
      description: null,
      url: null,
      skills: [],
    };
    render(
      <ProjectSection
        items={[
          {
            ...base,
            id: "p1",
            name: "MyWork",
            image_url: "https://exemple.supabase.co/storage/v1/object/public/project-images/u/p1/1.png",
          },
          { ...base, id: "p2", name: "Sans image", image_url: null },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "Aperçu du projet MyWork" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Aperçu du projet Sans image" })).not.toBeInTheDocument();
  });

  it("affiche les sections dans l'ordre choisi", () => {
    render(
      <PublicProfileView
        profile={{
          username: "remy",
          is_online: true,
          display_name: "Rémy Moro",
          headline: null,
          avatar_url: null,
          location: null,
          open_to_work: false,
          open_to_work_details: null,
          hasContact: false,
          website_url: null,
          linkedin_url: null,
          github_url: null,
          other_url: null,
          about: "Bonjour",
          top_skills: [],
          skills: ["React"],
          section_order: ["skills", "languages"],
        }}
        experiences={[]}
        educations={[]}
        languages={[{ id: "l1", position: 0, is_visible: true, name: "Français", level: "maternelle" }]}
        certifications={[]}
        projects={[]}
      />,
    );
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["COMPÉTENCES", "LANGUES", "À PROPOS"]);
  });

  it("affiche l'offre freelance avec TJM, modes, zone et prestations, ou rien si désactivée", () => {
    const { container, rerender } = render(<FreelanceSection offer={null} services={[]} />);
    expect(container).toBeEmptyDOMElement();

    rerender(
      <FreelanceSection
        nowIso="2026-10-01"
        offer={{
          availability: "a_partir_du",
          available_from: "2026-12-15",
          work_modes: ["hybride", "teletravail"],
          daily_rate: 450,
          travel_zone: "Agen et 100 km",
        }}
        services={[
          {
            id: "s1",
            position: 0,
            is_visible: true,
            title: "Site vitrine",
            description: "Conception et mise en ligne",
            starting_price: 1200,
          },
        ]}
      />,
    );
    expect(screen.getByText("Disponible à partir du 15 déc. 2026")).toBeInTheDocument();
    expect(screen.getByText("Hybride · Télétravail")).toBeInTheDocument();
    expect(screen.getByText("450 € HT / jour")).toBeInTheDocument();
    expect(screen.getByText("Agen et 100 km")).toBeInTheDocument();
    expect(screen.getByText("Site vitrine")).toBeInTheDocument();
    expect(screen.getByText("à partir de 1 200 € HT")).toBeInTheDocument();
  });

  it("traduit la disponibilité choisie (date passée = disponible)", () => {
    const base = { available_from: null, work_modes: [], daily_rate: null, travel_zone: null };
    const { rerender } = render(
      <FreelanceSection
        nowIso="2026-10-01"
        offer={{ ...base, availability: "a_partir_du", available_from: "2026-01-01" }}
        services={[]}
      />,
    );
    expect(screen.getByText("Disponible dès maintenant")).toBeInTheDocument();

    rerender(<FreelanceSection offer={{ ...base, availability: "indisponible" }} services={[]} />);
    expect(screen.getByText("Indisponible pour le moment")).toBeInTheDocument();

    rerender(<FreelanceSection offer={{ ...base, availability: "non_precisee" }} services={[]} />);
    expect(screen.queryByText(/Disponible|Indisponible/)).not.toBeInTheDocument();
    expect(screen.getByText("Je propose mes services en freelance")).toBeInTheDocument();
  });
});
