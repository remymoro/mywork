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

describe("logo du site", () => {
  it("affiche le livre ouvert et le nom MyWork", async () => {
    const { Logo } = await import("./logo");
    const { container } = render(<Logo />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.textContent).toContain("MyWork");
  });
});
