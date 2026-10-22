"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  FILES_BUCKET,
  storageLimit,
  totalUsage,
  uniqueName,
  validateName,
  validateUpload,
} from "@/lib/drive";

export type DriveActionResult = { error?: string; saved?: boolean; id?: string; url?: string };
export type PreparedUpload = { error?: string; id?: string; path?: string; name?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Session = { supabase: Supabase; userId: string };
type DatabaseError = { message: string; code?: string } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function currentUser(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

function refresh() {
  revalidatePath("/dashboard/fichiers");
}

function saved(id?: string): DriveActionResult {
  refresh();
  return { saved: true, id };
}

/** Ne jamais exposer les détails internes de Postgres au navigateur. */
function databaseMessage(error: DatabaseError, fallback = "Impossible d'enregistrer. Réessaie.") {
  if (!error) return fallback;
  if (error.code === "23505") return "Ce nom existe déjà à cet endroit.";
  if (error.message.includes("100 éléments au maximum")) {
    return "Ce dossier est plein : 100 éléments au maximum.";
  }
  return fallback;
}

/** Les noms déjà pris dans un dossier (null = racine, où les dossiers comptent aussi). */
async function namesIn(session: Session, folderId: string | null): Promise<string[]> {
  let files = session.supabase.from("drive_files").select("name").eq("owner_id", session.userId);
  files = folderId ? files.eq("folder_id", folderId) : files.is("folder_id", null);
  const { data } = await files;
  return (data ?? []).map((row) => row.name as string);
}

async function ownedFolder(session: Session, folderId: string) {
  if (!UUID.test(folderId)) return false;
  const { data } = await session.supabase
    .from("drive_folders")
    .select("id")
    .eq("id", folderId)
    .eq("owner_id", session.userId)
    .maybeSingle();
  return Boolean(data);
}

export async function createFolder(name: string): Promise<DriveActionResult> {
  const session = await currentUser();
  const checked = validateName(name, { file: false });
  if (!checked.ok) return { error: checked.error };
  const { data, error } = await session.supabase
    .from("drive_folders")
    .insert({ owner_id: session.userId, name: checked.value })
    .select("id")
    .single();
  if (error || !data) return { error: databaseMessage(error, "Impossible de créer le dossier. Réessaie.") };
  return saved(data.id as string);
}

export async function renameFolder(folderId: string, name: string): Promise<DriveActionResult> {
  const session = await currentUser();
  const checked = validateName(name, { file: false });
  if (!checked.ok) return { error: checked.error };
  const { data, error } = await session.supabase
    .from("drive_folders")
    .update({ name: checked.value })
    .eq("id", folderId)
    .eq("owner_id", session.userId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: databaseMessage(error, "Impossible de renommer ce dossier. Réessaie.") };
  return saved();
}

/** Supprimer un dossier supprime ses fichiers : la base efface les lignes, on retire les objets. */
export async function deleteFolder(folderId: string): Promise<DriveActionResult> {
  const session = await currentUser();
  if (!(await ownedFolder(session, folderId))) return { error: "Dossier introuvable." };
  const { data: files } = await session.supabase
    .from("drive_files")
    .select("storage_path")
    .eq("folder_id", folderId)
    .eq("owner_id", session.userId);
  const { data, error } = await session.supabase
    .from("drive_folders")
    .delete()
    .eq("id", folderId)
    .eq("owner_id", session.userId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Impossible de supprimer ce dossier. Réessaie." };
  const paths = (files ?? []).map((row) => row.storage_path as string);
  if (paths.length) await session.supabase.storage.from(FILES_BUCKET).remove(paths);
  return saved();
}

/**
 * Étape 1 d'un import : contrôles (nom, taille, place restante), nom sans doublon, chemin.
 * Le fichier part ensuite directement du navigateur vers le stockage (il ne passe pas par Vercel).
 */
export async function prepareUpload(
  folderId: string | null,
  fileName: string,
  size: number,
): Promise<PreparedUpload> {
  const session = await currentUser();
  if (!Number.isFinite(size) || size < 0) return { error: "Fichier invalide." };
  const checked = validateUpload(fileName, size);
  if (!checked.ok) return { error: checked.error };
  if (folderId !== null && !(await ownedFolder(session, folderId))) return { error: "Dossier introuvable." };

  const { data: usage, error } = await session.supabase.rpc("storage_usage");
  if (error) return { error: "Impossible de vérifier la place disponible. Réessaie." };
  if (totalUsage(usage ?? []) + size > storageLimit(process.env.STORAGE_LIMIT_BYTES)) {
    return { error: "Le stockage est plein : supprime des fichiers avant d'en importer." };
  }

  const existing = await namesIn(session, folderId);
  const id = crypto.randomUUID();
  return { id, path: `${session.userId}/${id}`, name: uniqueName(checked.value, existing) };
}

/** Étape 2 : le fichier est dans le stockage, on l'enregistre. En cas de refus, on le retire. */
export async function finalizeUpload(input: {
  id: string;
  folderId: string | null;
  name: string;
  size: number;
  mimeType: string;
}): Promise<DriveActionResult> {
  const session = await currentUser();
  if (!UUID.test(input.id)) return { error: "Fichier invalide." };
  const path = `${session.userId}/${input.id}`;
  const checked = validateUpload(input.name, input.size);
  const folderOk = input.folderId === null || (await ownedFolder(session, input.folderId));
  if (!checked.ok || !folderOk) {
    await session.supabase.storage.from(FILES_BUCKET).remove([path]);
    return { error: checked.ok ? "Dossier introuvable." : checked.error };
  }
  const { error } = await session.supabase.from("drive_files").insert({
    id: input.id,
    owner_id: session.userId,
    folder_id: input.folderId,
    name: checked.value,
    storage_path: path,
    mime_type: input.mimeType.slice(0, 150) || "application/octet-stream",
    size_bytes: input.size,
  });
  if (error) {
    await session.supabase.storage.from(FILES_BUCKET).remove([path]);
    return { error: databaseMessage(error, "Impossible d'enregistrer le fichier. Réessaie.") };
  }
  return saved(input.id);
}

export async function renameFile(fileId: string, name: string): Promise<DriveActionResult> {
  const session = await currentUser();
  const checked = validateName(name, { file: true });
  if (!checked.ok) return { error: checked.error };
  const { data, error } = await session.supabase
    .from("drive_files")
    .update({ name: checked.value })
    .eq("id", fileId)
    .eq("owner_id", session.userId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: databaseMessage(error, "Impossible de renommer ce fichier. Réessaie.") };
  return saved();
}

export async function setFilePublic(fileId: string, isPublic: boolean): Promise<DriveActionResult> {
  const session = await currentUser();
  const { data, error } = await session.supabase
    .from("drive_files")
    .update({ is_public: isPublic })
    .eq("id", fileId)
    .eq("owner_id", session.userId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Impossible de changer la visibilité. Réessaie." };
  revalidatePath("/[username]", "page");
  return saved();
}

export async function deleteFile(fileId: string): Promise<DriveActionResult> {
  const session = await currentUser();
  const { data, error } = await session.supabase
    .from("drive_files")
    .delete()
    .eq("id", fileId)
    .eq("owner_id", session.userId)
    .select("storage_path")
    .maybeSingle();
  if (error || !data) return { error: "Impossible de supprimer ce fichier. Réessaie." };
  await session.supabase.storage.from(FILES_BUCKET).remove([data.storage_path as string]);
  revalidatePath("/[username]", "page");
  return saved();
}

/** Adresse signée de courte durée pour télécharger un de ses fichiers. */
export async function downloadFile(fileId: string): Promise<DriveActionResult> {
  const session = await currentUser();
  const { data: file } = await session.supabase
    .from("drive_files")
    .select("name, storage_path")
    .eq("id", fileId)
    .eq("owner_id", session.userId)
    .maybeSingle();
  if (!file) return { error: "Fichier introuvable." };
  const { data, error } = await session.supabase.storage
    .from(FILES_BUCKET)
    .createSignedUrl(file.storage_path as string, 60, { download: file.name as string });
  if (error || !data) return { error: "Impossible de télécharger ce fichier. Réessaie." };
  return { url: data.signedUrl };
}
