import type { createClient } from "@/lib/supabase/server";
import { totalUsage, type DriveEntry } from "@/lib/drive";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Codes renvoyés quand la migration du Drive n'est pas (encore) appliquée : table ou fonction absente. */
const NOT_READY_CODES = ["PGRST205", "PGRST202", "42P01", "42883"];

export class DriveNotReadyError extends Error {
  constructor() {
    super("Le Drive n'est pas encore activé sur la base de données.");
  }
}

export type DriveContent = {
  /** Dossier ouvert ; null à la racine. */
  folder: { id: string; name: string } | null;
  entries: DriveEntry[];
  usedBytes: number;
};

/** Contenu d'un dossier (un seul niveau) : à la racine, les dossiers puis les fichiers sans dossier. */
export async function loadDrive(
  supabase: Supabase,
  userId: string,
  folderId: string | null,
): Promise<DriveContent> {
  let folder: DriveContent["folder"] = null;
  if (folderId) {
    const { data } = await supabase
      .from("drive_folders")
      .select("id, name")
      .eq("id", folderId)
      .eq("owner_id", userId)
      .maybeSingle();
    folder = data ? { id: data.id as string, name: data.name as string } : null;
  }

  let filesQuery = supabase
    .from("drive_files")
    .select("id, name, size_bytes, mime_type, is_public, updated_at")
    .eq("owner_id", userId)
    .limit(100);
  filesQuery = folder ? filesQuery.eq("folder_id", folder.id) : filesQuery.is("folder_id", null);

  const [filesRes, foldersRes, usageRes] = await Promise.all([
    filesQuery,
    folder
      ? Promise.resolve({ data: [] as { id: string; name: string; created_at: string }[], error: null })
      : supabase.from("drive_folders").select("id, name, created_at").eq("owner_id", userId).limit(100),
    supabase.rpc("storage_usage"),
  ]);
  for (const failure of [filesRes.error, foldersRes.error, usageRes.error]) {
    if (failure?.code && NOT_READY_CODES.includes(failure.code)) throw new DriveNotReadyError();
  }
  if (filesRes.error) throw new Error(`Lecture des fichiers impossible : ${filesRes.error.message}`);
  if (foldersRes.error) throw new Error(`Lecture des dossiers impossible : ${foldersRes.error.message}`);

  const entries: DriveEntry[] = [
    ...(foldersRes.data ?? []).map((row) => ({
      kind: "folder" as const,
      id: row.id,
      name: row.name,
      size: null,
      mimeType: null,
      updatedAt: row.created_at,
      isPublic: false,
    })),
    ...(filesRes.data ?? []).map((row) => ({
      kind: "file" as const,
      id: row.id as string,
      name: row.name as string,
      size: Number(row.size_bytes),
      mimeType: row.mime_type as string,
      updatedAt: row.updated_at as string,
      isPublic: row.is_public as boolean,
    })),
  ];
  return { folder, entries, usedBytes: totalUsage(usageRes.data ?? []) };
}
