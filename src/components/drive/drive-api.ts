import {
  createFolder,
  deleteFile,
  deleteFolder,
  downloadFile,
  finalizeUpload,
  prepareUpload,
  renameFile,
  renameFolder,
  setFilePublic,
  type DriveActionResult,
  type PreparedUpload,
} from "@/app/dashboard/fichiers/actions";
import { FILES_BUCKET } from "@/lib/drive";
import { createClient } from "@/lib/supabase/client";

/**
 * Tout ce que l'interface du Drive demande au « monde extérieur ». Il passe par Supabase
 * (`realDriveApi`) ; les tests en fournissent une version factice.
 */
export type DriveApi = {
  createFolder(name: string): Promise<DriveActionResult>;
  renameFolder(id: string, name: string): Promise<DriveActionResult>;
  deleteFolder(id: string): Promise<DriveActionResult>;
  prepareUpload(folderId: string | null, name: string, size: number): Promise<PreparedUpload>;
  /** Envoie le contenu du fichier à l'endroit préparé (le stockage Supabase, ou nulle part en aperçu). */
  uploadFile(path: string, file: File, contentType: string): Promise<{ error?: string }>;
  finalizeUpload(input: {
    id: string;
    folderId: string | null;
    name: string;
    size: number;
    mimeType: string;
  }): Promise<DriveActionResult>;
  renameFile(id: string, name: string): Promise<DriveActionResult>;
  setFilePublic(id: string, isPublic: boolean): Promise<DriveActionResult>;
  deleteFile(id: string): Promise<DriveActionResult>;
  downloadFile(id: string): Promise<DriveActionResult>;
};

export const realDriveApi: DriveApi = {
  createFolder,
  renameFolder,
  deleteFolder,
  prepareUpload,
  async uploadFile(path, file, contentType) {
    const { error } = await createClient().storage.from(FILES_BUCKET).upload(path, file, { contentType });
    return error ? { error: error.message } : {};
  },
  finalizeUpload,
  renameFile,
  setFilePublic,
  deleteFile,
  downloadFile,
};
