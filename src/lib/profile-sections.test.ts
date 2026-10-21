import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatMonth,
  formatDay,
  formatEuros,
  getInitials,
  validateFreelance,
  validateService,
  moveInList,
  normalizeSectionOrder,
  isSectionName,
  normalizeUrl,
  parseSkills,
  toMonthInput,
  validateAbout,
  validateCertification,
  validateEducation,
  validateExperience,
  validateHeader,
  validateLanguage,
  validateProject,
  validateSkills,
} from "./profile-sections";

describe("normalizeUrl", () => {
  it("ajoute https:// et refuse les adresses non web", () => {
    expect(normalizeUrl("github.com/remy")).toBe("https://github.com/remy");
    expect(normalizeUrl("http://exemple.fr")).toBe("http://exemple.fr/");
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("pas une adresse")).toBeNull();
    expect(normalizeUrl("  ")).toBeNull();
  });
});

describe("parseSkills", () => {
  it("sépare par virgule ou ligne, enlève les doublons et limite le nombre", () => {
    expect(parseSkills("React, typescript\nReact , ,TypeScript", 5)).toEqual({
      ok: true,
      value: ["React", "typescript"],
    });
    expect(parseSkills("a,b,c", 2)).toEqual({ ok: false, error: "2 compétences maximum." });
    expect(parseSkills("x".repeat(41), 5).ok).toBe(false);
  });
});

describe("validateHeader", () => {
  it("nettoie les champs et ignore la précision si non disponible", () => {
    const result = validateHeader({
      location: " Lyon, France ",
      open_to_work_details: "freelance",
      contact_email: "contact@exemple.fr",
      linkedin_url: "linkedin.com/in/remy",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        location: "Lyon, France",
        open_to_work: false,
        open_to_work_details: null,
        contact_email: "contact@exemple.fr",
        website_url: null,
        linkedin_url: "https://linkedin.com/in/remy",
        github_url: null,
        other_url: null,
      },
    });
  });

  it("garde la précision si disponible et refuse un e-mail invalide", () => {
    const ok = validateHeader({ open_to_work: "on", open_to_work_details: "CDI" });
    expect(ok.ok && ok.value.open_to_work_details).toBe("CDI");
    expect(validateHeader({ contact_email: "pas-un-email" })).toEqual({
      ok: false,
      error: "E-mail de contact : adresse e-mail invalide.",
    });
  });
});

describe("validateAbout et validateSkills", () => {
  it("limite la présentation et les compétences clés", () => {
    expect(validateAbout({ about: "Bonjour", top_skills: "a,b" })).toEqual({
      ok: true,
      value: { about: "Bonjour", top_skills: ["a", "b"] },
    });
    expect(validateAbout({ about: "x".repeat(2601) }).ok).toBe(false);
    expect(validateAbout({ top_skills: "a,b,c,d,e,f" }).ok).toBe(false);
    expect(validateSkills({ skills: "" })).toEqual({ ok: true, value: { skills: [] } });
  });
});

describe("validateExperience", () => {
  const base = { title: "Développeur", company: "MyWork", start_date: "2024-01" };

  it("accepte un poste actuel sans date de fin", () => {
    const result = validateExperience({ ...base, is_current: "on", end_date: "2025-01", employment_type: "cdi" });
    expect(result).toMatchObject({
      ok: true,
      value: { start_date: "2024-01-01", end_date: null, is_current: true, employment_type: "cdi" },
    });
  });

  it("exige une fin ou « poste actuel », et une fin après le début", () => {
    expect(validateExperience(base)).toEqual({
      ok: false,
      error: "Indique une date de fin ou coche « Poste actuel ».",
    });
    expect(validateExperience({ ...base, end_date: "2023-12" })).toEqual({
      ok: false,
      error: "La fin doit être après le début.",
    });
  });

  it("refuse un champ obligatoire vide ou un choix inconnu", () => {
    expect(validateExperience({ ...base, is_current: "on", title: " " })).toEqual({
      ok: false,
      error: "Le poste est obligatoire.",
    });
    expect(validateExperience({ ...base, is_current: "on", work_mode: "lune" }).ok).toBe(false);
  });
});

describe("autres sections", () => {
  it("valide formation, langue, certification et projet", () => {
    expect(validateEducation({ school: "Lyon 1", start_year: "2018", end_year: "2020" })).toMatchObject({
      ok: true,
      value: { school: "Lyon 1", start_year: 2018, end_year: 2020 },
    });
    expect(validateEducation({ school: "Lyon 1", start_year: "2020", end_year: "2018" }).ok).toBe(false);
    expect(validateLanguage({ name: "Anglais", level: "courant" })).toEqual({
      ok: true,
      value: { name: "Anglais", level: "courant" },
    });
    expect(validateLanguage({ name: "Anglais" })).toEqual({ ok: false, error: "Le niveau est obligatoire." });
    expect(
      validateCertification({ name: "AWS", issued_on: "2023-03", credential_url: "aws.com/verif" }),
    ).toMatchObject({ ok: true, value: { issued_on: "2023-03-01", credential_url: "https://aws.com/verif" } });
    expect(validateProject({ name: "MyWork", skills: "Next.js, Supabase" })).toMatchObject({
      ok: true,
      value: { name: "MyWork", skills: ["Next.js", "Supabase"] },
    });
    expect(validateProject({ name: "MyWork", start_date: "2024-13" }).ok).toBe(false);
  });
});

describe("affichage", () => {
  it("formate les mois et les durées façon LinkedIn", () => {
    expect(formatMonth("2024-01-01")).toBe("janv. 2024");
    expect(formatDuration("2024-01-01", "2025-10-01")).toBe("1 an 10 mois");
    expect(formatDuration("2020-09-01", "2023-12-01")).toBe("3 ans 4 mois");
    expect(formatDuration("2024-01-01", "2024-01-01")).toBe("1 mois");
    expect(toMonthInput("2024-01-01")).toBe("2024-01");
    expect(toMonthInput(null)).toBe("");
  });

  it("reconnaît les noms de section", () => {
    expect(isSectionName("experiences")).toBe(true);
    expect(isSectionName("profiles")).toBe(false);
  });
});

describe("getInitials", () => {
  it("prend la 1re lettre du prénom et du nom, sinon une seule lettre", () => {
    expect(getInitials("Rémy Moro", "remy")).toBe("RM");
    expect(getInitials("Jean Luc Picard", "jl")).toBe("JP");
    expect(getInitials("  ", "remy")).toBe("R");
    expect(getInitials("remy", "remy")).toBe("R");
    expect(getInitials("", "")).toBe("?");
  });
});

describe("ordre des sections", () => {
  it("complète l'ordre enregistré et ignore les inconnus ou doublons", () => {
    expect(normalizeSectionOrder([])).toEqual([
      "about", "experiences", "educations", "skills", "languages", "certifications", "projects",
    ]);
    expect(normalizeSectionOrder(["projects", "pirate", "experiences", "projects"])).toEqual([
      "projects", "experiences", "about", "educations", "skills", "languages", "certifications",
    ]);
  });

  it("déplace un élément d'une place à une autre", () => {
    expect(moveInList(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveInList(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveInList(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
});

describe("validateFreelance et validateService", () => {
  it("lit l'interrupteur, la disponibilité, les modes cochés, le TJM et la zone", () => {
    expect(
      validateFreelance({
        freelance_enabled: "on",
        freelance_availability: "a_partir_du",
        freelance_available_from: "2026-11-15",
        freelance_mode_hybride: "on",
        freelance_mode_teletravail: "on",
        freelance_daily_rate: "1 200",
        freelance_travel_zone: " Agen et 100 km ",
      }),
    ).toEqual({
      ok: true,
      value: {
        freelance_enabled: true,
        freelance_availability: "a_partir_du",
        freelance_available_from: "2026-11-15",
        freelance_work_modes: ["hybride", "teletravail"],
        freelance_daily_rate: 1200,
        freelance_travel_zone: "Agen et 100 km",
      },
    });
    expect(validateFreelance({})).toMatchObject({
      ok: true,
      value: { freelance_enabled: false, freelance_availability: "non_precisee", freelance_work_modes: [] },
    });
    // La date n'est gardée que pour « À partir du », et y est obligatoire.
    expect(
      validateFreelance({ freelance_availability: "disponible", freelance_available_from: "2026-11-15" }),
    ).toMatchObject({ ok: true, value: { freelance_available_from: null } });
    expect(validateFreelance({ freelance_availability: "a_partir_du" })).toEqual({
      ok: false,
      error: "Indique la date à partir de laquelle tu es disponible.",
    });
    expect(validateFreelance({ freelance_availability: "bientot" }).ok).toBe(false);
    expect(validateFreelance({ freelance_daily_rate: "abc" }).ok).toBe(false);
  });

  it("valide une prestation et formate les euros", () => {
    expect(validateService({ title: "Site vitrine", starting_price: "800" })).toEqual({
      ok: true,
      value: { title: "Site vitrine", description: null, starting_price: 800 },
    });
    expect(validateService({ title: "" })).toEqual({ ok: false, error: "Le nom de la prestation est obligatoire." });
    expect(formatEuros(1200)).toBe("1 200 €");
    expect(formatEuros(450)).toBe("450 €");
    expect(formatDay("2026-11-05")).toBe("5 nov. 2026");
  });
});
