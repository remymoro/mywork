import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  it("met le profil public en avant et liste les modules à venir", () => {
    render(<Sidebar />);
    expect(screen.getByText("Profil public")).toHaveAttribute("aria-current", "page");
    for (const name of ["CV", "Rendez-vous", "Boards", "Fichiers", "Visio"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Bientôt").length).toBeGreaterThanOrEqual(5);
  });
});
