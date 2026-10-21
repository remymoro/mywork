// Le site garde toujours la variante Éditorial (D22) : seul le mode clair/sombre se choisit.
export const MODES = ["light", "dark"] as const;

export type Mode = (typeof MODES)[number];

export const DEFAULT_MODE: Mode = "light";

export const MODE_STORAGE_KEY = "mywork-mode";

const MODE_VALUES: readonly string[] = MODES;

export function parseMode(value: unknown): Mode {
  return typeof value === "string" && MODE_VALUES.includes(value)
    ? (value as Mode)
    : DEFAULT_MODE;
}
