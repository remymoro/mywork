import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_HOURS } from "@/lib/rdv";

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

    fireEvent.click(screen.getByRole("button", { name: "Me contacter" }));
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
    expect(screen.getByRole("button", { name: "Me contacter" })).toBeInTheDocument();
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

  it("place l'offre freelance dans une carte à droite, à part des autres sections", () => {
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
          skills: [],
          freelance: {
            availability: "disponible",
            available_from: null,
            work_modes: ["hybride"],
            daily_rate: 450,
            travel_zone: null,
          },
        }}
        experiences={[]}
        educations={[]}
        languages={[]}
        certifications={[]}
        projects={[]}
      />,
    );
    const aside = screen.getByRole("complementary");
    expect(within(aside).getByRole("heading", { name: "Freelance" })).toBeInTheDocument();
    expect(within(aside).getByText("450 € HT / jour")).toBeInTheDocument();
    expect(within(aside).queryByRole("heading", { name: "À PROPOS" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "À PROPOS" })).toBeInTheDocument();
  });

  describe("onglets Profil / Drive", () => {
    const profile = {
      username: "remy",
      is_online: true,
      display_name: "Rémy Moro",
      headline: null,
      avatar_url: null,
      location: "Lyon",
      open_to_work: false,
      open_to_work_details: null,
      hasContact: true,
      website_url: "https://mywork.website",
      linkedin_url: null,
      github_url: null,
      other_url: null,
      about: "Bonjour",
      top_skills: [],
      skills: [],
      freelance: {
        availability: "disponible" as const,
        available_from: null,
        work_modes: ["hybride", "teletravail"],
        daily_rate: 450,
        travel_zone: null,
      },
    };
    const empty = { experiences: [], educations: [], languages: [], certifications: [], projects: [] };
    const files = [
      { id: "f1", name: "plaquette.pdf", size_bytes: 1000, updated_at: "2026-10-22T10:00:00Z", mime_type: "application/pdf" },
      { id: "f2", name: "schema.png", size_bytes: 2000, updated_at: "2026-10-21T10:00:00Z", mime_type: "image/png" },
    ];

    it("affiche l'onglet Drive même sans fichier public", () => {
      render(<PublicProfileView profile={profile} {...empty} />);
      const nav = screen.getByRole("navigation", { name: "Sections du profil" });
      expect(within(nav).getByRole("link", { name: "Profil" })).toHaveAttribute("aria-current", "page");
      expect(within(nav).getByRole("link", { name: "Drive" })).toHaveAttribute("href", "/remy?onglet=drive");
    });

    it("ouvre le Profil par défaut : sections, carte freelance, et aucune ressource", () => {
      render(<PublicProfileView profile={profile} {...empty} resources={files} />);
      const nav = screen.getByRole("navigation", { name: "Sections du profil" });
      expect(within(nav).getByRole("link", { name: "Drive" })).toHaveAttribute("href", "/remy?onglet=drive");
      expect(screen.getByRole("heading", { name: "À PROPOS" })).toBeInTheDocument();
      expect(screen.getByRole("complementary")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Documents en libre accès" })).not.toBeInTheDocument();
      expect(screen.queryByText("plaquette.pdf")).not.toBeInTheDocument();
    });

    it("ouvre le Drive avec les fichiers publics, sans les sections du profil", () => {
      render(<PublicProfileView profile={profile} {...empty} resources={files} activeTab="drive" />);
      expect(screen.getByRole("link", { name: "Drive" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("heading", { name: "Documents en libre accès" })).toBeInTheDocument();
      expect(screen.getByText("plaquette.pdf")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "À PROPOS" })).not.toBeInTheDocument();
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    });

    it("ouvre un Drive vide avec un message s'il n'y a aucun fichier public", () => {
      render(<PublicProfileView profile={profile} {...empty} activeTab="drive" />);
      expect(screen.getByRole("link", { name: "Drive" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByText("Aucun fichier à télécharger pour le moment.")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "À PROPOS" })).not.toBeInTheDocument();
    });

    it("n'affiche l'onglet Rendez-vous que si la réservation est activée", () => {
      const { unmount } = render(<PublicProfileView profile={profile} {...empty} />);
      expect(screen.queryByRole("link", { name: "Rendez-vous" })).not.toBeInTheDocument();
      unmount();
      const rdvConfig = { durations: [30], hours: DEFAULT_HOURS, exceptions: [], busy: [] };
      render(<PublicProfileView profile={profile} {...empty} rdvConfig={rdvConfig} nowIso="2026-10-22T08:00:00Z" />);
      expect(screen.getByRole("link", { name: "Rendez-vous" })).toHaveAttribute("href", "/remy?onglet=rdv");
    });

    it("ouvre la prise de rendez-vous dans l'onglet Rendez-vous, et retombe sur le Profil s'il est désactivé", () => {
      const rdvConfig = { durations: [30], hours: DEFAULT_HOURS, exceptions: [], busy: [] };
      const { unmount } = render(
        <PublicProfileView profile={profile} {...empty} rdvConfig={rdvConfig} nowIso="2026-10-22T08:00:00Z" activeTab="rdv" />,
      );
      expect(screen.getByRole("link", { name: "Rendez-vous" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("heading", { name: "Prendre rendez-vous" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "À PROPOS" })).not.toBeInTheDocument();
      unmount();
      render(<PublicProfileView profile={profile} {...empty} activeTab="rdv" />);
      expect(screen.getByRole("heading", { name: "À PROPOS" })).toBeInTheDocument();
    });

    it("filtre le Drive par type avec le sous-menu", () => {
      render(<PublicProfileView profile={profile} {...empty} resources={files} activeTab="drive" resourceFilter="images" />);
      const filter = screen.getByRole("navigation", { name: "Filtrer les ressources" });
      expect(within(filter).getByRole("link", { name: "Images" })).toHaveAttribute("aria-current", "true");
      expect(within(filter).getByRole("link", { name: "Documents" })).toHaveAttribute("href", "/remy?onglet=drive&type=documents");
      expect(within(filter).getByRole("link", { name: "Tous" })).toHaveAttribute("href", "/remy?onglet=drive");
      expect(screen.getByText("schema.png")).toBeInTheDocument();
      expect(screen.queryByText("plaquette.pdf")).not.toBeInTheDocument();
    });

    it("n'affiche pas le sous-menu quand tous les fichiers sont du même type", () => {
      render(<PublicProfileView profile={profile} {...empty} resources={[files[0]]} activeTab="drive" />);
      expect(screen.queryByRole("navigation", { name: "Filtrer les ressources" })).not.toBeInTheDocument();
    });

    it("résume lieu, mode de travail et disponibilité sous le nom, et range les liens en bas du Profil", () => {
      render(<PublicProfileView profile={profile} {...empty} />);
      expect(screen.getByText("Lyon")).toBeInTheDocument();
      // Le mode de travail figure aussi dans la carte Freelance : une fois en en-tête, une fois dans la carte.
      expect(screen.getAllByText("Hybride · Télétravail")).toHaveLength(2);
      expect(screen.getByText("Disponible dès maintenant", { selector: "li" })).toBeInTheDocument();
      const links = screen.getByRole("region", { name: "Liens" });
      expect(within(links).getByRole("link", { name: "Site" })).toHaveAttribute("href", "https://mywork.website");
      expect(screen.getByRole("button", { name: "Partager ce profil" })).toBeInTheDocument();
    });
  });
});
