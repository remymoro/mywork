import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeSectionOrder } from "@/lib/profile-sections";

const updateSectionOrder = vi.fn();
vi.mock("./actions", () => ({
  updateSectionOrder: (...args: unknown[]) => updateSectionOrder(...args),
}));

import { SectionOrderForm } from "./section-order-form";

function labels() {
  const list = screen.getByRole("list", { name: "Ordre des sections" });
  return within(list)
    .getAllByRole("listitem")
    .map((li) => li.textContent?.replace(/^\d+\./, ""));
}

describe("SectionOrderForm", () => {
  beforeEach(() => {
    updateSectionOrder.mockReset();
    updateSectionOrder.mockResolvedValue({ saved: true });
  });

  it("déplace une section par glisser-déposer et enregistre le nouvel ordre", async () => {
    render(<SectionOrderForm initialOrder={normalizeSectionOrder([])} />);
    const items = within(screen.getByRole("list", { name: "Ordre des sections" })).getAllByRole("listitem");
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };

    // « Projets » (dernier) glissé sur « Freelance » (premier).
    fireEvent.dragStart(items[7], { dataTransfer });
    fireEvent.dragOver(items[0], { dataTransfer });
    fireEvent.drop(items[0], { dataTransfer });

    expect(labels()[0]).toBe("Projets");
    expect(updateSectionOrder).toHaveBeenCalledWith([
      "projects", "freelance", "about", "experiences", "educations", "skills", "languages", "certifications",
    ]);
    expect(await screen.findByRole("status")).toHaveTextContent("Ordre enregistré.");
  });

  it("permet aussi de déplacer au clavier et revient en arrière en cas d'erreur", async () => {
    updateSectionOrder.mockResolvedValue({ error: "Impossible d'enregistrer l'ordre." });
    render(<SectionOrderForm initialOrder={normalizeSectionOrder([])} />);
    expect(screen.getByRole("button", { name: "Monter Freelance" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Descendre Freelance" }));
    expect(updateSectionOrder).toHaveBeenCalledWith(expect.arrayContaining(["freelance"]));
    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible d'enregistrer l'ordre.");
    await waitFor(() => expect(labels()[0]).toBe("Freelance"));
  });
});
