import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// L'aperçu ne doit jamais toucher au serveur ni à Supabase.
vi.mock("@/app/dashboard/fichiers/actions", () => {
  const forbidden = () => {
    throw new Error("appel serveur");
  };
  return {
    createFolder: forbidden, renameFolder: forbidden, deleteFolder: forbidden, prepareUpload: forbidden,
    finalizeUpload: forbidden, renameFile: forbidden, setFilePublic: forbidden, deleteFile: forbidden, downloadFile: forbidden,
  };
});
vi.mock("@/lib/supabase/client", () => ({ createClient: () => { throw new Error("appel Supabase"); } }));

import { DriveDemo } from "./drive-demo";

const names = () =>
  screen.getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);

describe("DriveDemo (fausses données)", () => {
  it("affiche des fichiers fictifs et la section Ressources des fichiers publics", () => {
    render(<DriveDemo />);
    expect(names()).toEqual(["Contrats", "Photos", "archive-2025.zip", "budget.xlsx", "CV-2026.pdf", "logo.png"]);
    const resources = screen.getByRole("region", { name: "Ressources" });
    expect(within(resources).getByText("CV-2026.pdf")).toBeInTheDocument();
    expect(within(resources).queryByText("budget.xlsx")).not.toBeInTheDocument();
  });

  it("ouvre un dossier et revient à la racine", () => {
    render(<DriveDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Contrats" }));
    expect(names()).toEqual(["contrat-client.pdf"]);
    fireEvent.click(screen.getByRole("button", { name: "Mes fichiers" }));
    expect(names()).toHaveLength(6);
  });

  it("rend un fichier public : il apparaît dans Ressources", async () => {
    render(<DriveDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Actions pour budget.xlsx" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rendre public" }));
    fireEvent.click(await screen.findByRole("button", { name: "Rendre public" }));
    await waitFor(() =>
      expect(within(screen.getByRole("region", { name: "Ressources" })).getByText("budget.xlsx")).toBeInTheDocument(),
    );
  });

  it("crée un dossier, refuse un doublon", async () => {
    render(<DriveDemo />);
    for (const [name, expected] of [["Archives", null], ["contrats", "Ce nom existe déjà à cet endroit."]] as const) {
      fireEvent.click(screen.getByRole("button", { name: "Nouveau dossier" }));
      fireEvent.change(await screen.findByLabelText("Nom"), { target: { value: name } });
      fireEvent.click(screen.getByRole("button", { name: "Créer" }));
      if (expected) {
        expect(await screen.findByText(expected)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
      } else {
        await waitFor(() => expect(names()).toContain("Archives"));
      }
    }
  });

  it("importe un fichier fictif, sans doublon de nom, et refuse un programme", async () => {
    render(<DriveDemo />);
    const input = screen.getByLabelText("Choisir des fichiers à importer");
    fireEvent.change(input, { target: { files: [new File(["x"], "logo.png", { type: "image/png" })] } });
    await waitFor(() => expect(names()).toContain("logo (2).png"));
    fireEvent.change(input, { target: { files: [new File(["x"], "setup.exe")] } });
    expect(await screen.findByText(/programme ou script/)).toBeInTheDocument();
  });

  it("supprime un fichier après confirmation", async () => {
    render(<DriveDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Actions pour logo.png" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Supprimer" }));
    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(names()).not.toContain("logo.png"));
  });
});
