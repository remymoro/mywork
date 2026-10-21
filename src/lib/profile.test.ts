import { describe, expect, it } from "vitest";
import { validateProfileInput } from "./profile";

const base = { username: "remy", displayName: "Rémy", headline: "Consultant" };

describe("validateProfileInput", () => {
  it("accepte un profil valide et nettoie les champs", () => {
    const r = validateProfileInput({ username: "  Remy-42 ", displayName: "  Rémy  ", headline: " Dev " });
    expect(r).toEqual({ ok: true, value: { username: "remy-42", displayName: "Rémy", headline: "Dev" } });
  });

  it("transforme les champs vides en null", () => {
    const r = validateProfileInput({ ...base, displayName: " ", headline: "" });
    expect(r).toEqual({ ok: true, value: { username: "remy", displayName: null, headline: null } });
  });

  it("refuse un pseudo invalide", () => {
    for (const username of ["ab", "-remy", "remy-", "re my", "a".repeat(31)]) {
      expect(validateProfileInput({ ...base, username }).ok).toBe(false);
    }
  });

  it("refuse un nom ou un titre trop longs", () => {
    expect(validateProfileInput({ ...base, displayName: "a".repeat(81) }).ok).toBe(false);
    expect(validateProfileInput({ ...base, headline: "a".repeat(121) }).ok).toBe(false);
  });
});
