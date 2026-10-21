import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const saveSectionItem = vi.fn().mockResolvedValue({ saved: true });
const deleteSectionItem = vi.fn().mockResolvedValue({});
const setSectionItemVisible = vi.fn().mockResolvedValue({});
const moveSectionItem = vi.fn().mockResolvedValue({});

vi.mock("./actions", () => ({
  saveSectionItem: (...args: unknown[]) => saveSectionItem(...args),
  deleteSectionItem: (...args: unknown[]) => deleteSectionItem(...args),
  setSectionItemVisible: (...args: unknown[]) => setSectionItemVisible(...args),
  moveSectionItem: (...args: unknown[]) => moveSectionItem(...args),
}));

import { ExperienceFields, type ExperienceRow } from "./experience-fields";
import { ProjectFields } from "./project-fields";
import { SectionList } from "./section-list";

const sampleExperiences: ExperienceRow[] = [
  {
    id: "exp-1",
    position: 0,
    is_visible: true,
    title: "Développeur",
    company: "MyWork",
    employment_type: "cdi",
    location: "Lyon",
    work_mode: "hybride",
    start_date: "2024-01-01",
    end_date: null,
    is_current: true,
    description: "Création du produit",
    skills: ["TypeScript", "Next.js"],
  },
  {
    id: "exp-2",
    position: 1,
    is_visible: false,
    title: "Consultant",
    company: "Acme",
    employment_type: "freelance",
    location: "Paris",
    work_mode: "teletravail",
    start_date: "2022-03-01",
    end_date: "2023-12-01",
    is_current: false,
    description: null,
    skills: [],
  },
];

describe("SectionList", () => {
  beforeEach(() => {
    saveSectionItem.mockClear();
    deleteSectionItem.mockClear();
    setSectionItemVisible.mockClear();
    moveSectionItem.mockClear();
  });

  it("déplie le formulaire vide au clic sur « Ajouter »", () => {
    render(<SectionList section="experiences" title="Expérience" items={[]} />);
    expect(screen.queryByLabelText("Poste")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(screen.getByLabelText("Poste")).toBeInTheDocument();
    expect(screen.getByLabelText("Entreprise")).toBeInTheDocument();
  });

  it("désactive Monter sur le premier élément et Descendre sur le dernier", () => {
    render(<SectionList section="experiences" title="Expérience" items={sampleExperiences} />);

    expect(screen.getByText("Développeur · MyWork — janv. 2024 – aujourd'hui")).toBeInTheDocument();
    expect(screen.getByText("Consultant · Acme — mars 2022 – déc. 2023")).toBeInTheDocument();
    expect(screen.getByText("Masqué")).toBeInTheDocument();

    const upButtons = screen.getAllByRole("button", { name: "Monter" });
    const downButtons = screen.getAllByRole("button", { name: "Descendre" });

    expect(upButtons[0]).toBeDisabled();
    expect(upButtons[1]).not.toBeDisabled();
    expect(downButtons[0]).not.toBeDisabled();
    expect(downButtons[1]).toBeDisabled();
  });

  it("appelle setSectionItemVisible au clic sur Masquer ou Afficher", () => {
    render(<SectionList section="experiences" title="Expérience" items={sampleExperiences} />);

    fireEvent.click(screen.getByRole("button", { name: "Masquer" }));
    expect(setSectionItemVisible).toHaveBeenCalledWith("experiences", "exp-1", false);

    fireEvent.click(screen.getByRole("button", { name: "Afficher" }));
    expect(setSectionItemVisible).toHaveBeenCalledWith("experiences", "exp-2", true);
  });

  it("déplie le formulaire prérempli avec l'identifiant caché au clic sur Modifier", () => {
    const { container } = render(
      <SectionList section="experiences" title="Expérience" items={sampleExperiences} />,
    );

    const editButtons = screen.getAllByRole("button", { name: "Modifier" });
    fireEvent.click(editButtons[0]);

    expect(screen.getByLabelText("Poste")).toHaveValue("Développeur");
    expect(screen.getByLabelText("Entreprise")).toHaveValue("MyWork");
    const hiddenId = container.querySelector('input[type="hidden"][name="id"]');
    expect(hiddenId).toHaveValue("exp-1");
  });
});

describe("ExperienceFields", () => {
  it("désactive la date de fin lorsque « Poste actuel » est coché", () => {
    render(<ExperienceFields />);
    const endDateInput = screen.getByLabelText("Fin");
    const currentCheckbox = screen.getByLabelText("Poste actuel");

    expect(endDateInput).not.toBeDisabled();
    fireEvent.click(currentCheckbox);
    expect(endDateInput).toBeDisabled();
    fireEvent.click(currentCheckbox);
    expect(endDateInput).not.toBeDisabled();
  });
});

describe("ProjectFields", () => {
  it("propose d'envoyer une image, et de la retirer si le projet en a déjà une", () => {
    const { unmount } = render(<ProjectFields />);
    expect(screen.getByLabelText("Image du projet")).toHaveAttribute("type", "file");
    expect(screen.queryByLabelText("Retirer l'image")).not.toBeInTheDocument();
    unmount();

    render(
      <ProjectFields
        item={{
          id: "p1",
          position: 0,
          is_visible: true,
          name: "MyWork",
          start_date: null,
          end_date: null,
          description: null,
          url: null,
          skills: [],
          image_url: "https://exemple.supabase.co/storage/v1/object/public/project-images/u/p1/1.png",
        }}
      />,
    );
    expect(screen.getByRole("img", { name: "Image actuelle de MyWork" })).toBeInTheDocument();
    expect(screen.getByLabelText("Retirer l'image")).toBeInTheDocument();
  });
});
