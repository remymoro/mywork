import { describe, expect, it } from "vitest";
import { DEFAULT_MODE, parseMode } from "./appearance";

describe("appearance", () => {
  it("valide le mode clair/sombre ou revient au défaut", () => {
    expect(parseMode("light")).toBe("light");
    expect(parseMode("dark")).toBe("dark");
    expect(parseMode("sepia")).toBe(DEFAULT_MODE);
    expect(parseMode(null)).toBe(DEFAULT_MODE);
  });
});
