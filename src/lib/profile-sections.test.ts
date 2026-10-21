import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatMonth,
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
