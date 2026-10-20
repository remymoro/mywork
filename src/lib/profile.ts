import { isValidUsername, normalizeUsername } from "@/lib/username";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ProfileValues = {
  username: string;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
};

type Result = { values: ProfileValues; error?: undefined } | { error: string; values?: undefined };

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

/** Ajoute https:// si absent et vérifie l'adresse. Renvoie null si vide, undefined si invalide. */
export function normalizeUrl(input: string, allowedHosts?: string[]): string | null | undefined {
  if (!input) return null;
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return undefined;
  }
  if (!url.hostname.includes(".")) return undefined;
  if (allowedHosts) {
    const host = url.hostname.replace(/^www\./, "");
    if (!allowedHosts.some((h) => host === h || host.endsWith(`.${h}`))) return undefined;
    url.protocol = "https:";
  }
  const result = url.toString();
  return result.length > 200 ? undefined : result;
}

export function parseProfileForm(formData: FormData): Result {
  const username = normalizeUsername(clean(formData.get("username")));
  if (!isValidUsername(username)) {
    return { error: "Pseudo : 3 à 30 caractères, minuscules, chiffres et tirets (pas au début ni à la fin)." };
  }

  const limits: [string, string, number][] = [
    ["display_name", "Nom affiché", 80],
    ["headline", "Titre", 120],
    ["bio", "Présentation", 500],
    ["location", "Localisation", 80],
  ];
  const text: Record<string, string | null> = {};
  for (const [key, label, max] of limits) {
    const value = clean(formData.get(key));
    if (value.length > max) return { error: `${label} : ${max} caractères maximum.` };
    text[key] = value || null;
  }

  const website = normalizeUrl(clean(formData.get("website")));
  if (website === undefined) return { error: "Site web : adresse invalide." };
  const linkedin = normalizeUrl(clean(formData.get("linkedin_url")), ["linkedin.com"]);
  if (linkedin === undefined) return { error: "LinkedIn : adresse invalide (linkedin.com/in/…)." };
  const github = normalizeUrl(clean(formData.get("github_url")), ["github.com"]);
  if (github === undefined) return { error: "GitHub : adresse invalide (github.com/…)." };

  return {
    values: {
      username,
      display_name: text.display_name,
      headline: text.headline,
      bio: text.bio,
      location: text.location,
      website,
      linkedin_url: linkedin,
      github_url: github,
    },
  };
}

export function avatarError(file: { size: number; type: string }): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return "Photo : JPEG, PNG ou WebP uniquement.";
  if (file.size > AVATAR_MAX_BYTES) return "Photo : 2 Mo maximum.";
  return null;
}

export function initials(name: string): string {
  const parts = name.trim().split(/[\s-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}

/** Texte lisible d'une adresse pour l'affichage : sans https:// ni slash final. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}
