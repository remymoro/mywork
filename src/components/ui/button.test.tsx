import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("affiche son texte", () => {
    render(<Button>Réserver</Button>);
    expect(screen.getByRole("button", { name: "Réserver" })).toBeInTheDocument();
  });
});
