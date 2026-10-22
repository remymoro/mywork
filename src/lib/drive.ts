// Règles du Drive (docs/drive.md) : validation, tri, recherche et affichage, sans accès à la base.

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ITEMS_PER_FOLDER = 100;
export const NAME_MAX = 100;
/** Plafond de l'offre gratuite Supabase ; remplaçable par la variable STORAGE_LIMIT_BYTES. */
export const DEFAULT_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;
export const FILES_BUCKET = "files";

/** Programmes et scripts refusés : un fichier public ne doit pas en diffuser. */
export const FORBIDDEN_EXTENSIONS = [
  "exe", "msi", "bat", "cmd", "com", "scr", "sh", "js", "vbs", "jar", "apk", "dmg",
] as const;

type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
}

export function hasForbiddenExtension(name: string): boolean {
  return (FORBIDDEN_EXTENSIONS as readonly string[]).includes(extensionOf(name));
}

export function validateName(raw: string, { file }: { file: boolean }): Checked<string> {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Donne un nom." };
  if (value.length > NAME_MAX) return { ok: false, error: `${NAME_MAX} caractères au maximum.` };
  if (value.includes("/")) return { ok: false, error: "Le nom ne peut pas contenir « / »." };
  if (file && hasForbiddenExtension(value)) {
    return { ok: false, error: "Ce type de fichier (programme ou script) n'est pas accepté." };
  }
  return { ok: true, value };
}

export function validateUpload(name: string, size: number): Checked<string> {
  const checked = validateName(name, { file: true });
  if (!checked.ok) return checked;
  if (size > MAX_FILE_BYTES) {
    return { ok: false, error: `« ${checked.value} » dépasse ${formatSize(MAX_FILE_BYTES)}.` };
  }
  return checked;
}

/** « nom.ext » déjà pris → « nom (2).ext », « nom (3).ext »… (sans tenir compte des majuscules). */
export function uniqueName(name: string, existing: readonly string[]): string {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf(".");
  const base = dot <= 0 ? name : name.slice(0, dot);
  const ext = dot <= 0 ? "" : name.slice(dot);
  for (let n = 2; ; n++) {
    const suffix = ` (${n})${ext}`;
    const candidate = base.slice(0, NAME_MAX - suffix.length) + suffix;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

export type DriveEntry = {
  kind: "folder" | "file";
  id: string;
  name: string;
  /** null pour un dossier. */
  size: number | null;
  mimeType: string | null;
  updatedAt: string;
  isPublic: boolean;
};

export type SortKey = "name" | "date";
export type SortDirection = "asc" | "desc";

/** Les dossiers restent toujours avant les fichiers. */
export function sortEntries(
  entries: readonly DriveEntry[],
  key: SortKey,
  direction: SortDirection,
): DriveEntry[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    const order =
      key === "name"
        ? a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true })
        : Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
    return order * sign;
  });
}

/** Minuscules et sans accents : « Résumé » est trouvé par « resume ». */
export function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function filterEntries(entries: readonly DriveEntry[], query: string): DriveEntry[] {
  const needle = normalizeForSearch(query.trim());
  if (!needle) return [...entries];
  return entries.filter((entry) => normalizeForSearch(entry.name).includes(needle));
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const units = ["Ko", "Mo", "Go"];
  let value = bytes;
  let unit = -1;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const text = value >= 100 || Number.isInteger(value) ? Math.round(value).toString() : value.toFixed(1);
  return `${text.replace(".", ",")} ${units[unit]}`;
}

export function formatDriveDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" })
    .format(new Date(iso));
}

export type StorageUsageRow = { bucket_id: string; bytes: number | string };

export function totalUsage(rows: readonly StorageUsageRow[]): number {
  return rows.reduce((sum, row) => sum + Number(row.bytes), 0);
}

export function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function storageLimit(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_STORAGE_LIMIT_BYTES;
}

export type FileCategory = "documents" | "images" | "autres";
export const FILE_CATEGORIES: { id: FileCategory; label: string }[] = [
  { id: "documents", label: "Documents" },
  { id: "images", label: "Images" },
  { id: "autres", label: "Autres" },
];

const DOCUMENT_EXTENSIONS = ["pdf", "doc", "docx", "odt", "rtf", "txt", "md", "xls", "xlsx", "ods", "csv", "ppt", "pptx", "odp"];

/** Type d'un fichier pour le filtre du Drive public (d'après le type MIME, sinon l'extension). */
export function categoryOf(mimeType: string | null | undefined, name: string): FileCategory {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return "images";
  if (
    mime === "application/pdf" ||
    mime.startsWith("text/") ||
    /word|excel|spreadsheet|presentation|powerpoint|opendocument|msword|rtf/.test(mime)
  ) {
    return "documents";
  }
  if (!mime || mime === "application/octet-stream") {
    const ext = extensionOf(name);
    if (["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(ext)) return "images";
    if (DOCUMENT_EXTENSIONS.includes(ext)) return "documents";
  }
  return "autres";
}
