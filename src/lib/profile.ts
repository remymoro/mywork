import { isValidUsername, normalizeUsername } from "./username";

export const DISPLAY_NAME_MAX = 80;
export const HEADLINE_MAX = 120;

export type ProfileInput = { username: string; displayName: string | null; headline: string | null };

export function validateProfileInput(
  raw: { username: string; displayName: string; headline: string },
): { ok: true; value: ProfileInput } | { ok: false; error: string } {
  const username = normalizeUsername(raw.username);
  if (!isValidUsername(username)) {
    return { ok: false, error: "3 à 30 caractères : minuscules, chiffres et tirets (pas au début ni à la fin)." };
  }
  const displayName = raw.displayName.trim();
  if (displayName.length > DISPLAY_NAME_MAX) {
    return { ok: false, error: `Le nom affiché est limité à ${DISPLAY_NAME_MAX} caractères.` };
  }
  const headline = raw.headline.trim();
  if (headline.length > HEADLINE_MAX) {
    return { ok: false, error: `Le titre est limité à ${HEADLINE_MAX} caractères.` };
  }
  return { ok: true, value: { username, displayName: displayName || null, headline: headline || null } };
}
