export const THEMES = [
  { id: "editorial", label: "Éditorial" },
  { id: "neutral", label: "Neutre" },
  { id: "blue", label: "Bleu Ardoise" },
  { id: "warm", label: "Sauge & Argile" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const MODES = ["light", "dark"] as const;

export type Mode = (typeof MODES)[number];

export const DEFAULT_THEME: ThemeId = "editorial";
export const DEFAULT_MODE: Mode = "light";

export const THEME_STORAGE_KEY = "mywork-theme";
export const MODE_STORAGE_KEY = "mywork-mode";

const THEME_IDS: readonly string[] = THEMES.map((t) => t.id);
const MODE_VALUES: readonly string[] = MODES;

export function parseTheme(value: unknown): ThemeId {
  return typeof value === "string" && THEME_IDS.includes(value)
    ? (value as ThemeId)
    : DEFAULT_THEME;
}

export function parseMode(value: unknown): Mode {
  return typeof value === "string" && MODE_VALUES.includes(value)
    ? (value as Mode)
    : DEFAULT_MODE;
}

export function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || "?";
}
