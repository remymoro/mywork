import { describe, expect, it } from "vitest";
import { isValidUsername, normalizeUsername } from "./username";

describe("pseudo", () => {
  it("accepte un pseudo simple", () => {
    expect(isValidUsername("remy")).toBe(true);
    expect(isValidUsername("remy-moro-2")).toBe(true);
  });

  it("refuse trop court, majuscules, espaces et tirets aux extrémités", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("Remy")).toBe(false);
    expect(isValidUsername("re my")).toBe(false);
    expect(isValidUsername("-remy")).toBe(false);
    expect(isValidUsername("remy-")).toBe(false);
  });

  it("refuse plus de 30 caractères", () => {
    expect(isValidUsername("a".repeat(31))).toBe(false);
    expect(isValidUsername("a".repeat(30))).toBe(true);
  });

  it("normalise les majuscules et les espaces autour", () => {
    expect(normalizeUsername("  Remy ")).toBe("remy");
  });
});
