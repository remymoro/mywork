import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  createFolder: vi.fn(),
  deleteFile: vi.fn(),
  deleteFolder: vi.fn(),
  downloadFile: vi.fn(),
  finalizeUpload: vi.fn(),
  prepareUpload: vi.fn(),
  renameFile: vi.fn(),
  renameFolder: vi.fn(),
  setFilePublic: vi.fn(),
}));
const storageUpload = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/dashboard/fichiers/actions", () => actions);
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ storage: { from: () => ({ upload: storageUpload }) } }),
}));

import { DriveWorkspace } from "./drive-workspace";
import type { DriveEntry } from "@/lib/drive";

const MB = 1024 * 1024;
const entries: DriveEntry[] = [
  { kind: "file", id: "f1", name: "CV-2026.pdf", size: 1.4 * MB, mimeType: "application/pdf", updatedAt: "2026-10-22T10:00:00Z", isPublic: true },
  { kind: "file", id: "f2", name: "budget.xlsx", size: 86 * 1024, mimeType: "application/vnd.ms-excel", updatedAt: "2026-10-20T10:00:00Z", isPublic: false },
  { kind: "folder", id: "d1", name: "Contrats", size: null, mimeType: null, updatedAt: "2026-10-18T10:00:00Z", isPublic: false },
];

const renderDrive = (props: Partial<React.ComponentProps<typeof DriveWorkspace>> = {}) =>
  render(<DriveWorkspace folder={null} entries={entries} usedBytes={412 * MB} limitBytes={1024 * MB} {...props} />);

const names = () =>
  screen.getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);

beforeEach(() => {
  vi.clearAllMocks();
  for (const action of Object.values(actions)) action.mockResolvedValue({ saved: true });
  storageUpload.mockResolvedValue({ error: null });
});

describe("DriveWorkspace : liste", () => {
  it("affiche les dossiers avant les fichiers, avec taille et statut", () => {
    renderDrive();
    expect(names()).toEqual(["Contrats", "budget.xlsx", "CV-2026.pdf"]);
    expect(screen.getByText("1,4 Mo")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("Privé")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contrats" })).toHaveAttribute("href", "/dashboard/fichiers?dossier=d1");
  });

  it("trie par date au clic sur l'en-tête, puis inverse l'ordre", () => {
    renderDrive();
    fireEvent.click(screen.getByRole("button", { name: /Modifié le/ }));
    expect(names()).toEqual(["Contrats", "CV-2026.pdf", "budget.xlsx"]);
    fireEvent.click(screen.getByRole("button", { name: /Modifié le/ }));
    expect(names()).toEqual(["Contrats", "budget.xlsx", "CV-2026.pdf"]);
  });

  it("filtre avec la recherche, sans accents ni majuscules", () => {
    renderDrive();
    fireEvent.change(screen.getByLabelText("Rechercher dans ce dossier"), { target: { value: "BUDGET" } });
    expect(names()).toEqual(["budget.xlsx"]);
    fireEvent.change(screen.getByLabelText("Rechercher dans ce dossier"), { target: { value: "zzz" } });
    expect(screen.getByText("Aucun résultat pour cette recherche.")).toBeInTheDocument();
  });

  it("invite à importer quand le dossier est vide", () => {
    renderDrive({ entries: [] });
    expect(screen.getByText("Aucun fichier ici. Clique sur Importer.")).toBeInTheDocument();
  });

  it("n'offre pas de nouveau dossier à l'intérieur d'un dossier (un seul niveau)", () => {
    renderDrive({ folder: { id: "d1", name: "Contrats" }, entries: [] });
    expect(screen.queryByRole("button", { name: "Nouveau dossier" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mes fichiers" })).toHaveAttribute("href", "/dashboard/fichiers");
  });
});

describe("DriveWorkspace : actions", () => {
  it("demande confirmation avant de rendre un fichier public", async () => {
    renderDrive();
    fireEvent.click(screen.getByRole("button", { name: "Actions pour budget.xlsx" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rendre public" }));
    expect(await screen.findByText(/N’importe qui pourra télécharger ce fichier/)).toBeInTheDocument();
    expect(actions.setFilePublic).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Rendre public" }));
    await waitFor(() => expect(actions.setFilePublic).toHaveBeenCalledWith("f2", true));
  });

  it("repasse un fichier public en privé sans confirmation", async () => {
    renderDrive();
    fireEvent.click(screen.getByRole("button", { name: "Actions pour CV-2026.pdf" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rendre privé" }));
    await waitFor(() => expect(actions.setFilePublic).toHaveBeenCalledWith("f1", false));
  });

  it("crée un dossier", async () => {
    renderDrive();
    fireEvent.click(screen.getByRole("button", { name: "Nouveau dossier" }));
    fireEvent.change(await screen.findByLabelText("Nom"), { target: { value: "Photos" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));
    await waitFor(() => expect(actions.createFolder).toHaveBeenCalledWith("Photos"));
  });

  it("affiche l'erreur renvoyée par le serveur", async () => {
    actions.createFolder.mockResolvedValue({ error: "Ce nom existe déjà à cet endroit." });
    renderDrive();
    fireEvent.click(screen.getByRole("button", { name: "Nouveau dossier" }));
    fireEvent.change(await screen.findByLabelText("Nom"), { target: { value: "Contrats" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));
    expect(await screen.findByText("Ce nom existe déjà à cet endroit.")).toBeInTheDocument();
  });

  it("supprime un dossier après confirmation", async () => {
    renderDrive();
    fireEvent.click(screen.getByRole("button", { name: "Actions pour Contrats" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Supprimer" }));
    expect(await screen.findByText(/tous les fichiers qu’il contient/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(actions.deleteFolder).toHaveBeenCalledWith("d1"));
  });
});

describe("DriveWorkspace : import", () => {
  const choose = (...files: File[]) =>
    fireEvent.change(screen.getByLabelText("Choisir des fichiers à importer"), { target: { files } });

  it("prépare, envoie dans le stockage puis enregistre chaque fichier", async () => {
    actions.prepareUpload.mockResolvedValue({ id: "id-1", path: "u/id-1", name: "note (2).txt" });
    renderDrive({ folder: { id: "d1", name: "Contrats" } });
    const file = new File(["bonjour"], "note.txt", { type: "text/plain" });
    choose(file);
    await waitFor(() => expect(actions.finalizeUpload).toHaveBeenCalled());
    expect(actions.prepareUpload).toHaveBeenCalledWith("d1", "note.txt", file.size);
    expect(storageUpload).toHaveBeenCalledWith("u/id-1", file, { contentType: "text/plain" });
    expect(actions.finalizeUpload).toHaveBeenCalledWith({
      id: "id-1",
      folderId: "d1",
      name: "note (2).txt",
      size: file.size,
      mimeType: "text/plain",
    });
  });

  it("n'envoie rien dans le stockage si la préparation refuse le fichier", async () => {
    actions.prepareUpload.mockResolvedValue({ error: "« gros.zip » dépasse 10 Mo." });
    renderDrive();
    choose(new File(["x"], "gros.zip"));
    expect(await screen.findByText("« gros.zip » dépasse 10 Mo.")).toBeInTheDocument();
    expect(storageUpload).not.toHaveBeenCalled();
    expect(actions.finalizeUpload).not.toHaveBeenCalled();
  });

  it("bloque l'import quand le stockage est plein", () => {
    renderDrive({ usedBytes: 1024 * MB });
    expect(screen.getByRole("button", { name: "Importer" })).toBeDisabled();
    expect(screen.getByText(/imports sont bloqués/)).toBeInTheDocument();
  });
});

describe("DriveWorkspace : jauge", () => {
  it("indique l'utilisation et les autres consommateurs de la capacité", () => {
    renderDrive();
    expect(screen.getByText("412 Mo utilisés sur 1 Go")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Stockage utilisé" })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText(/partagée avec ta photo de profil, les images de tes projets et les images de tes tableaux Kanban/)).toBeInTheDocument();
  });
});
