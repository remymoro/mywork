import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  getInitials,
  parseMode,
  parseTheme,
} from "./appearance";

describe("appearance", () => {
  it("valide le thème ou revient au défaut", () => {
    expect(parseTheme("editorial")).toBe("editorial");
    expect(parseTheme("neutral")).toBe("neutral");
    expect(parseTheme("blue")).toBe("blue");
    expect(parseTheme("warm")).toBe("warm");
    expect(parseTheme("inconnu")).toBe(DEFAULT_THEME);
    expect(parseTheme(null)).toBe(DEFAULT_THEME);
    expect(parseTheme(undefined)).toBe(DEFAULT_THEME);
  });

  it("valide le mode clair/sombre ou revient au défaut", () => {
    expect(parseMode("light")).toBe("light");
    expect(parseMode("dark")).toBe("dark");
    expect(parseMode("sepia")).toBe(DEFAULT_MODE);
    expect(parseMode(null)).toBe(DEFAULT_MODE);
  });

  it("calcule jusqu'à deux initiales en majuscules ou '?' si vide", () => {
    expect(getInitials("Rémy Moro")).toBe("RM");
    expect(getInitials("jean luc picard")).toBe("JL");
    expect(getInitials("remy")).toBe("R");
    expect(getInitials("   ")).toBe("?");
    expect(getInitials("")).toBe("?");
  });
});
