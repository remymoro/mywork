import { describe, expect, it } from "vitest";
import { avatarError, displayUrl, initials, normalizeUrl, parseProfileForm } from "./profile";

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

describe("normalizeUrl", () => {
  it("laisse vide un champ vide", () => expect(normalizeUrl("")).toBeNull());
  it("ajoute https://", () => expect(normalizeUrl("monsite.fr")).toBe("https://monsite.fr/"));
  it("refuse une adresse sans point", () => expect(normalizeUrl("monsite")).toBeUndefined());
  it("refuse un autre site que celui attendu", () => {
    expect(normalizeUrl("https://exemple.com/in/moi", ["linkedin.com"])).toBeUndefined();
    expect(normalizeUrl("fr.linkedin.com/in/moi", ["linkedin.com"])).toBe("https://fr.linkedin.com/in/moi");
  });
  it("force https pour LinkedIn et GitHub", () => {
    expect(normalizeUrl("http://github.com/moi", ["github.com"])).toBe("https://github.com/moi");
  });
});

describe("parseProfileForm", () => {
  it("accepte un profil complet", () => {
    const r = parseProfileForm(form({ username: " Camille-D ", display_name: "Camille Dupont", bio: "Bonjour", github_url: "github.com/camille" }));
    expect(r.error).toBeUndefined();
    expect(r.values?.username).toBe("camille-d");
    expect(r.values?.github_url).toBe("https://github.com/camille");
    expect(r.values?.headline).toBeNull();
  });
  it("refuse un pseudo invalide", () => {
    expect(parseProfileForm(form({ username: "A" })).error).toMatch(/Pseudo/);
  });
  it("refuse une présentation trop longue", () => {
    expect(parseProfileForm(form({ username: "camille", bio: "x".repeat(501) })).error).toMatch(/Présentation/);
  });
  it("refuse un lien LinkedIn d'un autre site", () => {
    expect(parseProfileForm(form({ username: "camille", linkedin_url: "exemple.com" })).error).toMatch(/LinkedIn/);
  });
});

describe("avatarError", () => {
  it("accepte une petite image", () => expect(avatarError({ size: 1000, type: "image/png" })).toBeNull());
  it("refuse un PDF", () => expect(avatarError({ size: 1000, type: "application/pdf" })).toMatch(/JPEG/));
  it("refuse plus de 2 Mo", () => expect(avatarError({ size: 3 * 1024 * 1024, type: "image/png" })).toMatch(/2 Mo/));
});

describe("initials et displayUrl", () => {
  it("prend prénom et nom", () => expect(initials("Camille Dupont")).toBe("CD"));
  it("prend deux lettres pour un seul mot", () => expect(initials("camille")).toBe("CA"));
  it("gère un nom vide", () => expect(initials("  ")).toBe("?"));
  it("raccourcit l'adresse", () => expect(displayUrl("https://www.monsite.fr/")).toBe("monsite.fr"));
});
