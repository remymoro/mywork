import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "./alert";
import { Badge } from "./badge";
import { Heading } from "./typography";

describe("design system", () => {
  it("Heading rend la bonne balise selon le niveau", () => {
    render(<Heading level={2}>Section</Heading>);
    expect(screen.getByRole("heading", { level: 2, name: "Section" })).toBeInTheDocument();
  });

  it("Alert est annoncée comme une alerte", () => {
    render(<Alert variant="destructive">Erreur</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Erreur");
  });

  it("Badge affiche son texte", () => {
    render(<Badge variant="success">Confirmé</Badge>);
    expect(screen.getByText("Confirmé")).toBeInTheDocument();
  });
});
