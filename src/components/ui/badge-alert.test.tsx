import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert, AlertDescription } from "./alert";
import { Badge } from "./badge";

describe("Badge et Alert", () => {
  it("affichent leurs variantes succès et accent", () => {
    render(
      <>
        <Badge variant="success">En ligne</Badge>
        <Badge variant="accent">Actif</Badge>
        <Alert variant="success" role="status">
          <AlertDescription>Profil enregistré.</AlertDescription>
        </Alert>
      </>,
    );
    expect(screen.getByText("En ligne")).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Profil enregistré.");
  });
});
