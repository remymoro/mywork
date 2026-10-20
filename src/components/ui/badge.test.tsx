import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Badge } from "./badge";

describe("Badge", () => {
  it("affiche son texte", () => {
    render(<Badge variant="success">Confirmé</Badge>);
    expect(screen.getByText("Confirmé")).toBeInTheDocument();
  });
});

describe("Alert", () => {
  it("est annoncée comme une alerte avec titre et description", () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>Réessaie.</AlertDescription>
      </Alert>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Erreur");
    expect(screen.getByRole("alert")).toHaveTextContent("Réessaie.");
  });
});
