"use client";

import { useMemo, useState } from "react";
import { totalUsage, uniqueName, validateName, validateUpload, type DriveEntry } from "@/lib/drive";
import type { DriveApi } from "./drive-api";
import { DriveWorkspace } from "./drive-workspace";
import { ResourcesSection } from "./resources-section";

const MB = 1024 * 1024;

type DemoItem = DriveEntry & { folderId: string | null };

/** Fausses données de l'aperçu : rien n'est envoyé ni enregistré, tout est perdu au rechargement. */
export const DEMO_ITEMS: DemoItem[] = [
  { kind: "folder", id: "demo-contrats", name: "Contrats", size: null, mimeType: null, updatedAt: "2026-10-18T10:00:00Z", isPublic: false, folderId: null },
  { kind: "folder", id: "demo-photos", name: "Photos", size: null, mimeType: null, updatedAt: "2026-10-12T10:00:00Z", isPublic: false, folderId: null },
  { kind: "file", id: "demo-cv", name: "CV-2026.pdf", size: 1.4 * MB, mimeType: "application/pdf", updatedAt: "2026-10-22T10:00:00Z", isPublic: true, folderId: null },
  { kind: "file", id: "demo-budget", name: "budget.xlsx", size: 86 * 1024, mimeType: "application/vnd.ms-excel", updatedAt: "2026-10-20T10:00:00Z", isPublic: false, folderId: null },
  { kind: "file", id: "demo-logo", name: "logo.png", size: 240 * 1024, mimeType: "image/png", updatedAt: "2026-10-15T10:00:00Z", isPublic: true, folderId: null },
  { kind: "file", id: "demo-archive", name: "archive-2025.zip", size: 8.2 * MB, mimeType: "application/zip", updatedAt: "2026-10-03T10:00:00Z", isPublic: false, folderId: null },
  { kind: "file", id: "demo-contrat", name: "contrat-client.pdf", size: 620 * 1024, mimeType: "application/pdf", updatedAt: "2026-10-18T09:00:00Z", isPublic: false, folderId: "demo-contrats" },
  { kind: "file", id: "demo-plage", name: "plage.jpg", size: 3.1 * MB, mimeType: "image/jpeg", updatedAt: "2026-10-12T09:00:00Z", isPublic: false, folderId: "demo-photos" },
];

/** Photo de profil et images du Kanban : elles consomment aussi la capacité (jauge). */
const OTHER_USAGE_BYTES = 94 * MB;
const DEMO_LIMIT_BYTES = 1024 * MB;

const fail = (error: string) => Promise.resolve({ error });
const done = (id?: string) => Promise.resolve({ saved: true, id });

export function DriveDemo({ initialItems = DEMO_ITEMS }: { initialItems?: DemoItem[] }) {
  const [items, setItems] = useState<DemoItem[]>(initialItems);
  const [folderId, setFolderId] = useState<string | null>(null);
  const folder = folderId ? items.find((i) => i.kind === "folder" && i.id === folderId) : null;

  const api: DriveApi = useMemo(() => {
    const touch = (id: string, change: Partial<DemoItem>) =>
      setItems((list) => list.map((i) => (i.id === id ? { ...i, ...change, updatedAt: new Date().toISOString() } : i)));
    const taken = (inFolder: string | null, ignoreId?: string) =>
      items.filter((i) => i.kind === "file" && i.folderId === inFolder && i.id !== ignoreId).map((i) => i.name);
    const rootCount = () => items.filter((i) => i.folderId === null).length;

    return {
      createFolder(name) {
        const checked = validateName(name, { file: false });
        if (!checked.ok) return fail(checked.error);
        if (items.some((i) => i.kind === "folder" && i.name.toLowerCase() === checked.value.toLowerCase())) {
          return fail("Ce nom existe déjà à cet endroit.");
        }
        if (rootCount() >= 100) return fail("Ce dossier est plein : 100 éléments au maximum.");
        const id = crypto.randomUUID();
        setItems((list) => [
          ...list,
          { kind: "folder", id, name: checked.value, size: null, mimeType: null, updatedAt: new Date().toISOString(), isPublic: false, folderId: null },
        ]);
        return done(id);
      },
      renameFolder(id, name) {
        const checked = validateName(name, { file: false });
        if (!checked.ok) return fail(checked.error);
        touch(id, { name: checked.value });
        return done();
      },
      deleteFolder(id) {
        setItems((list) => list.filter((i) => i.id !== id && i.folderId !== id));
        return done();
      },
      async prepareUpload(inFolder, name, size) {
        const checked = validateUpload(name, size);
        if (!checked.ok) return { error: checked.error };
        const used = totalUsage([{ bucket_id: "demo", bytes: items.reduce((n, i) => n + (i.size ?? 0), 0) + OTHER_USAGE_BYTES }]);
        if (used + size > DEMO_LIMIT_BYTES) return { error: "Le stockage est plein : supprime des fichiers avant d'en importer." };
        const id = crypto.randomUUID();
        return { id, path: `demo/${id}`, name: uniqueName(checked.value, taken(inFolder)) };
      },
      uploadFile: () => Promise.resolve({}),
      finalizeUpload({ id, folderId: inFolder, name, size, mimeType }) {
        setItems((list) => [
          ...list,
          { kind: "file", id, name, size, mimeType, updatedAt: new Date().toISOString(), isPublic: false, folderId: inFolder },
        ]);
        return done(id);
      },
      renameFile(id, name) {
        const checked = validateName(name, { file: true });
        if (!checked.ok) return fail(checked.error);
        const current = items.find((i) => i.id === id);
        if (taken(current?.folderId ?? null, id).some((n) => n.toLowerCase() === checked.value.toLowerCase())) {
          return fail("Ce nom existe déjà à cet endroit.");
        }
        touch(id, { name: checked.value });
        return done();
      },
      setFilePublic(id, isPublic) {
        touch(id, { isPublic });
        return done();
      },
      deleteFile(id) {
        setItems((list) => list.filter((i) => i.id !== id));
        return done();
      },
      downloadFile: () => fail("Le téléchargement n'existe pas dans l'aperçu : il fonctionnera avec le vrai Drive."),
    };
  }, [items]);

  const entries = items.filter((i) => i.folderId === (folder ? folder.id : null));
  const usedBytes = items.reduce((n, i) => n + (i.size ?? 0), 0) + OTHER_USAGE_BYTES;
  const publicFiles = items
    .filter((i) => i.kind === "file" && i.isPublic)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((i) => ({ id: i.id, name: i.name, size_bytes: i.size ?? 0, updated_at: i.updatedAt }));

  return (
    <div className="space-y-10">
      <DriveWorkspace
        folder={folder ? { id: folder.id, name: folder.name } : null}
        entries={entries}
        usedBytes={usedBytes}
        limitBytes={DEMO_LIMIT_BYTES}
        api={api}
        onChange={() => {}}
        onOpenFolder={setFolderId}
      />
      <div className="space-y-3 border-t pt-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Ce que voit un visiteur sur le profil public
        </p>
        {publicFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun fichier public : la section « Ressources » n’apparaît pas sur le profil.
          </p>
        ) : (
          <ResourcesSection username="demo" items={publicFiles} />
        )}
      </div>
    </div>
  );
}
