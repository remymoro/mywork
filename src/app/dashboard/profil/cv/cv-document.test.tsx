import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CvDocument, type CvDocumentProps } from "./cv-document";

const props: CvDocumentProps = {
  profile: {
    display_name: "Rémy Moro",
    username: "remy",
    headline: "Développeur",
    avatar_url: null,
    location: "Paris",
    contact_email: "remy@example.com",
    website_url: null,
    linkedin_url: null,
    github_url: null,
    other_url: null,
    about: "Présentation",
    top_skills: ["React"],
    skills: ["TypeScript"],
    open_to_work: false,
    open_to_work_details: null,
    section_order: ["skills", "experiences", "about"],
  },
  experiences: [
    {
      id: "e1",
      position: 0,
      is_visible: true,
      title: "Ingénieur",
      company: "Acme",
      employment_type: "cdi",
      location: null,
      work_mode: null,
      start_date: "2024-01-01",
      end_date: null,
      is_current: true,
      description: null,
      skills: [],
    },
  ],
  educations: [],
  languages: [],
  certifications: [],
  projects: [],
  today: "2026-10-21",
};

describe("CvDocument", () => {
  it("affiche le nom et le poste actuel puis les sections remplies dans l'ordre choisi", () => {
    render(<CvDocument {...props} />);
    expect(screen.getByText("Rémy Moro")).toBeInTheDocument();
    expect(screen.getAllByText("Ingénieur")).toHaveLength(2);
    const titles = within(document.getElementById("cv-document")!)
      .getAllByRole("heading", { level: 2 })
      .map((item) => item.textContent);
    expect(titles).toEqual(["Compétences", "Expérience", "À propos"]);
    expect(screen.getByText(/Aujourd’hui · 2 ans 10 mois/)).toBeInTheDocument();
  });

  it("masque les sections vides et l'offre freelance", () => {
    render(
      <CvDocument
        {...props}
        profile={{ ...props.profile, about: null, top_skills: [], skills: [] }}
        experiences={[]}
      />,
    );
    expect(screen.queryByRole("heading", { name: "Expérience" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Compétences" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Freelance/)).not.toBeInTheDocument();
  });
});

describe("CvDocument — coordonnées", () => {
  it("affiche la disponibilité et des liens lisibles", () => {
    render(
      <CvDocument
        {...props}
        profile={{
          ...props.profile,
          open_to_work: true,
          open_to_work_details: "Alternance",
          linkedin_url: "https://www.linkedin.com/in/r%C3%A9my-moro/",
        }}
      />,
    );
    expect(screen.getByText("Ouvert aux opportunités : Alternance")).toBeInTheDocument();
    expect(screen.getByText(/linkedin\.com\/in\/rémy-moro/)).toBeInTheDocument();
  });
});
