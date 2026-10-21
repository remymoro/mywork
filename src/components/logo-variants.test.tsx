import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogoMTypo, LogoMonogramme, LogoNomSeul, LogoPages } from "./logo-variants";

describe("pistes de logo", () => {
  it.each([
    ["monogramme", LogoMonogramme, "MyWork"],
    ["M typographique", LogoMTypo, "yWork"],
    ["pages ouvertes", LogoPages, "MyWork"],
    ["nom seul", LogoNomSeul, "MyWork"],
  ])("%s affiche le nom du site", (_nom, Logo, texte) => {
    const { container } = render(<Logo />);
    expect(container.textContent).toContain(texte);
  });
});
