// Module Profil, version 1 (docs/modules.md) : validation des formulaires, sans accès à la base.
// Chaque fonction reçoit les champs du formulaire (texte brut) et renvoie les valeurs à enregistrer.

export const EMPLOYMENT_TYPES = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "freelance", label: "Freelance" },
  { value: "stage", label: "Stage" },
  { value: "alternance", label: "Alternance" },
  { value: "interim", label: "Intérim" },
  { value: "benevole", label: "Bénévole" },
  { value: "autre", label: "Autre" },
] as const;

export const WORK_MODES = [
  { value: "sur_site", label: "Sur site" },
  { value: "hybride", label: "Hybride" },
  { value: "teletravail", label: "Télétravail" },
] as const;

export const LANGUAGE_LEVELS = [
  { value: "notions", label: "Notions" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "professionnel", label: "Professionnel" },
  { value: "courant", label: "Courant" },
  { value: "bilingue", label: "Bilingue" },
  { value: "maternelle", label: "Langue maternelle" },
] as const;

export const ABOUT_MAX = 2600;
export const DESCRIPTION_MAX = 2000;
export const TOP_SKILLS_MAX = 5;
export const SKILLS_MAX = 50;
export const ITEM_SKILLS_MAX = 20;
export const SKILL_MAX = 40;

export type Fields = Record<string, string | undefined>;
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

class InvalidField extends Error {}

function fail(message: string): never {
  throw new InvalidField(message);
}

// Les validateurs lèvent InvalidField ; validate() la transforme en résultat.
function validate<T>(build: () => T): Result<T> {
  try {
    return { ok: true, value: build() };
  } catch (e) {
    if (e instanceof InvalidField) return { ok: false, error: e.message };
    throw e;
  }
}

function text(fields: Fields, name: string, label: string, max: number): string | null {
  const value = (fields[name] ?? "").trim();
  if (value.length > max) fail(`${label} : ${max} caractères maximum.`);
  return value || null;
}

function required(fields: Fields, name: string, label: string, max: number): string {
  return text(fields, name, label, max) ?? fail(`${label} est obligatoire.`);
}

function choice<T extends string>(
  fields: Fields,
  name: string,
  label: string,
  options: readonly { value: T }[],
): T | null {
  const value = (fields[name] ?? "").trim();
  if (!value) return null;
  const found = options.find((o) => o.value === value);
  return found ? found.value : fail(`${label} : choix invalide.`);
}

/** Adresse web : ajoute https:// si besoin, refuse tout sauf http(s). */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".")) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function url(fields: Fields, name: string, label: string): string | null {
  const raw = (fields[name] ?? "").trim();
  if (!raw) return null;
  if (raw.length > 300) fail(`${label} : adresse trop longue.`);
  return normalizeUrl(raw) ?? fail(`${label} : adresse web invalide.`);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function email(fields: Fields, name: string, label: string): string | null {
  const value = (fields[name] ?? "").trim();
  if (!value) return null;
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) fail(`${label} : adresse e-mail invalide.`);
  return value;
}

/** Mois saisi avec <input type="month"> (« 2024-01 ») → date enregistrée « 2024-01-01 ». */
function month(fields: Fields, name: string, label: string): string | null {
  const value = (fields[name] ?? "").trim();
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) fail(`${label} : mois invalide.`);
  return `${match[1]}-${match[2]}-01`;
}

function year(fields: Fields, name: string, label: string): number | null {
  const value = (fields[name] ?? "").trim();
  if (!value) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1950 || n > 2100) fail(`${label} : année invalide.`);
  return n;
}

function checkbox(fields: Fields, name: string): boolean {
  return fields[name] === "on" || fields[name] === "true";
}

/** Compétences saisies séparées par des virgules ou des retours à la ligne, sans doublon. */
export function parseSkills(raw: string | undefined, max: number): Result<string[]> {
  return validate(() => skills({ s: raw }, "s", max));
}

function skills(fields: Fields, name: string, max: number): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const part of (fields[name] ?? "").split(/[,\n]/)) {
    const skill = part.trim();
    if (!skill || seen.has(skill.toLowerCase())) continue;
    if (skill.length > SKILL_MAX) fail(`« ${skill} » : ${SKILL_MAX} caractères maximum par compétence.`);
    seen.add(skill.toLowerCase());
    list.push(skill);
  }
  if (list.length > max) fail(`${max} compétences maximum.`);
  return list;
}

export type HeaderInput = {
  location: string | null;
  open_to_work: boolean;
  open_to_work_details: string | null;
  contact_email: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  other_url: string | null;
};

export function validateHeader(fields: Fields): Result<HeaderInput> {
  return validate(() => {
    const openToWork = checkbox(fields, "open_to_work");
    return {
      location: text(fields, "location", "Localisation", 100),
      open_to_work: openToWork,
      open_to_work_details: openToWork ? text(fields, "open_to_work_details", "Disponibilité", 120) : null,
      contact_email: email(fields, "contact_email", "E-mail de contact"),
      website_url: url(fields, "website_url", "Site web"),
      linkedin_url: url(fields, "linkedin_url", "LinkedIn"),
      github_url: url(fields, "github_url", "GitHub"),
      other_url: url(fields, "other_url", "Autre lien"),
    };
  });
}

export type AboutInput = { about: string | null; top_skills: string[] };

export function validateAbout(fields: Fields): Result<AboutInput> {
  return validate(() => ({
    about: text(fields, "about", "La présentation", ABOUT_MAX),
    top_skills: skills(fields, "top_skills", TOP_SKILLS_MAX),
  }));
}

export type SkillsInput = { skills: string[] };

export function validateSkills(fields: Fields): Result<SkillsInput> {
  return validate(() => ({ skills: skills(fields, "skills", SKILLS_MAX) }));
}

export type ExperienceInput = {
  title: string;
  company: string;
  employment_type: (typeof EMPLOYMENT_TYPES)[number]["value"] | null;
  location: string | null;
  work_mode: (typeof WORK_MODES)[number]["value"] | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  skills: string[];
};

export function validateExperience(fields: Fields): Result<ExperienceInput> {
  return validate(() => {
    const isCurrent = checkbox(fields, "is_current");
    const start = month(fields, "start_date", "Début") ?? fail("Début est obligatoire.");
    const end = isCurrent ? null : month(fields, "end_date", "Fin");
    if (!isCurrent && !end) fail("Indique une date de fin ou coche « Poste actuel ».");
    if (end && end < start) fail("La fin doit être après le début.");
    return {
      title: required(fields, "title", "Le poste", 100),
      company: required(fields, "company", "L'entreprise", 100),
      employment_type: choice(fields, "employment_type", "Type de contrat", EMPLOYMENT_TYPES),
      location: text(fields, "location", "Lieu", 100),
      work_mode: choice(fields, "work_mode", "Mode de travail", WORK_MODES),
      start_date: start,
      end_date: end,
      is_current: isCurrent,
      description: text(fields, "description", "La description", DESCRIPTION_MAX),
      skills: skills(fields, "skills", ITEM_SKILLS_MAX),
    };
  });
}

export type EducationInput = {
  school: string;
  degree: string | null;
  field: string | null;
  start_year: number | null;
  end_year: number | null;
  grade: string | null;
  description: string | null;
};

export function validateEducation(fields: Fields): Result<EducationInput> {
  return validate(() => {
    const start = year(fields, "start_year", "Année de début");
    const end = year(fields, "end_year", "Année de fin");
    if (start && end && end < start) fail("L'année de fin doit être après l'année de début.");
    return {
      school: required(fields, "school", "L'école", 120),
      degree: text(fields, "degree", "Le diplôme", 120),
      field: text(fields, "field", "Le domaine", 120),
      start_year: start,
      end_year: end,
      grade: text(fields, "grade", "La mention", 60),
      description: text(fields, "description", "La description", DESCRIPTION_MAX),
    };
  });
}

export type LanguageInput = {
  name: string;
  level: (typeof LANGUAGE_LEVELS)[number]["value"];
};

export function validateLanguage(fields: Fields): Result<LanguageInput> {
  return validate(() => ({
    name: required(fields, "name", "La langue", 60),
    level: choice(fields, "level", "Niveau", LANGUAGE_LEVELS) ?? fail("Le niveau est obligatoire."),
  }));
}

export type CertificationInput = {
  name: string;
  issuer: string | null;
  issued_on: string | null;
  expires_on: string | null;
  credential_url: string | null;
};

export function validateCertification(fields: Fields): Result<CertificationInput> {
  return validate(() => {
    const issued = month(fields, "issued_on", "Date d'obtention");
    const expires = month(fields, "expires_on", "Date d'expiration");
    if (issued && expires && expires < issued) fail("L'expiration doit être après l'obtention.");
    return {
      name: required(fields, "name", "Le nom", 120),
      issuer: text(fields, "issuer", "L'organisme", 120),
      issued_on: issued,
      expires_on: expires,
      credential_url: url(fields, "credential_url", "Lien de vérification"),
    };
  });
}

export type ProjectInput = {
  name: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  url: string | null;
  skills: string[];
};

export function validateProject(fields: Fields): Result<ProjectInput> {
  return validate(() => {
    const start = month(fields, "start_date", "Début");
    const end = month(fields, "end_date", "Fin");
    if (start && end && end < start) fail("La fin doit être après le début.");
    return {
      name: required(fields, "name", "Le nom", 120),
      start_date: start,
      end_date: end,
      description: text(fields, "description", "La description", DESCRIPTION_MAX),
      url: url(fields, "url", "Lien"),
      skills: skills(fields, "skills", ITEM_SKILLS_MAX),
    };
  });
}

/** Sections de la page publique, dans l'ordre par défaut (l'en-tête reste toujours en haut). */
export const PUBLIC_SECTIONS = [
  { id: "about", label: "À propos" },
  { id: "experiences", label: "Expérience" },
  { id: "educations", label: "Formation" },
  { id: "skills", label: "Compétences" },
  { id: "languages", label: "Langues" },
  { id: "certifications", label: "Certifications" },
  { id: "projects", label: "Projets" },
] as const;

export type PublicSectionId = (typeof PUBLIC_SECTIONS)[number]["id"];

/** Ordre enregistré → ordre complet : inconnus et doublons ignorés, sections manquantes ajoutées à la fin. */
export function normalizeSectionOrder(order: readonly string[] | null | undefined): PublicSectionId[] {
  const known = PUBLIC_SECTIONS.map((s) => s.id) as PublicSectionId[];
  const result: PublicSectionId[] = [];
  for (const id of order ?? []) {
    if ((known as string[]).includes(id) && !result.includes(id as PublicSectionId)) {
      result.push(id as PublicSectionId);
    }
  }
  return [...result, ...known.filter((id) => !result.includes(id))];
}

/** Déplace l'élément d'indice « from » à l'indice « to » (glisser-déposer). */
export function moveInList<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Sections à plusieurs éléments : nom côté code → table et validateur. */
export const SECTIONS = {
  experiences: { table: "profile_experiences", validate: validateExperience },
  educations: { table: "profile_educations", validate: validateEducation },
  languages: { table: "profile_languages", validate: validateLanguage },
  certifications: { table: "profile_certifications", validate: validateCertification },
  projects: { table: "profile_projects", validate: validateProject },
} as const;

export type SectionName = keyof typeof SECTIONS;

export function isSectionName(value: unknown): value is SectionName {
  return typeof value === "string" && Object.hasOwn(SECTIONS, value);
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** « 2024-01-01 » → « janv. 2024 ». */
export function formatMonth(date: string): string {
  const [y, m] = date.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** Durée façon LinkedIn, mois de début et de fin inclus : « 1 an 10 mois ». */
export function formatDuration(start: string, end: string): string {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const total = (ey - sy) * 12 + (em - sm) + 1;
  if (total < 1) return "";
  const years = Math.floor(total / 12);
  const months = total % 12;
  const parts = [];
  if (years) parts.push(`${years} an${years > 1 ? "s" : ""}`);
  if (months) parts.push(`${months} mois`);
  return parts.join(" ");
}

/** « 2024-01-01 » ou « 2024-01 » → valeur d'un <input type="month"> (« 2024-01 »). */
export function toMonthInput(date: string | null): string {
  return date ? date.slice(0, 7) : "";
}

/**
 * Initiales affichées à la place de la photo : 1re lettre du prénom + 1re lettre du nom
 * (premier et dernier mot du nom affiché, ex. « Jean Luc Picard » → « JP »).
 * Un seul mot (ou pas de nom affiché, donc le pseudo) : sa première lettre.
 */
export function getInitials(displayName: string, username: string): string {
  const parts = (displayName.trim() || username.trim()).split(/[\s-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

export function labelOf(options: readonly { value: string; label: string }[], value: string | null) {
  return options.find((o) => o.value === value)?.label ?? null;
}
