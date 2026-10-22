"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  File as FileIcon,
  FileText,
  Folder,
  FolderPlus,
  Globe,
  Image as ImageIcon,
  Lock,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  Upload,
  Download,
  Archive,
} from "lucide-react";
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
} from "@/app/dashboard/fichiers/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FILES_BUCKET,
  filterEntries,
  formatDriveDate,
  formatSize,
  sortEntries,
  usagePercent,
  type DriveEntry,
  type SortDirection,
  type SortKey,
} from "@/lib/drive";
import { createClient } from "@/lib/supabase/client";

const NETWORK_ERROR = "La connexion a été interrompue. Réessaie dans un instant.";

type Dialogue =
  | { type: "new-folder" }
  | { type: "rename"; entry: DriveEntry }
  | { type: "make-public"; entry: DriveEntry }
  | { type: "delete"; entry: DriveEntry };

export type DriveWorkspaceProps = {
  folder: { id: string; name: string } | null;
  entries: DriveEntry[];
  usedBytes: number;
  limitBytes: number;
};

function EntryIcon({ entry }: { entry: DriveEntry }) {
  const className = "size-5 shrink-0 text-muted-foreground";
  if (entry.kind === "folder") return <Folder aria-hidden="true" className={`${className} text-primary`} />;
  const mime = entry.mimeType ?? "";
  if (mime.startsWith("image/")) return <ImageIcon aria-hidden="true" className={className} />;
  if (mime === "application/pdf" || mime.startsWith("text/")) return <FileText aria-hidden="true" className={className} />;
  if (/zip|compressed|tar|rar|7z/.test(mime)) return <Archive aria-hidden="true" className={className} />;
  return <FileIcon aria-hidden="true" className={className} />;
}

export function DriveWorkspace({ folder, entries, usedBytes, limitBytes }: DriveWorkspaceProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState("");

  const visible = sortEntries(filterEntries(entries, query), sortKey, direction);
  const percent = usagePercent(usedBytes, limitBytes);
  const full = percent >= 100;

  function toggleSort(key: SortKey) {
    if (key === sortKey) setDirection(direction === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setDirection(key === "name" ? "asc" : "desc");
    }
  }

  async function run(action: () => Promise<DriveActionResult>) {
    setMessage("");
    try {
      const result = await action();
      if (result.error) setMessage(result.error);
      else router.refresh();
      return result;
    } catch {
      setMessage(NETWORK_ERROR);
      return { error: NETWORK_ERROR };
    }
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setMessage("");
    const supabase = createClient();
    const problems: string[] = [];
    for (const file of Array.from(files)) {
      setUploading(`Envoi de « ${file.name} »…`);
      try {
        const prepared = await prepareUpload(folder?.id ?? null, file.name, file.size);
        if (prepared.error || !prepared.id || !prepared.path || !prepared.name) {
          problems.push(prepared.error ?? "Impossible d'envoyer ce fichier.");
          continue;
        }
        const type = file.type || "application/octet-stream";
        const { error } = await supabase.storage
          .from(FILES_BUCKET)
          .upload(prepared.path, file, { contentType: type });
        if (error) {
          problems.push(`« ${file.name} » n'a pas pu être envoyé.`);
          continue;
        }
        const result = await finalizeUpload({
          id: prepared.id,
          folderId: folder?.id ?? null,
          name: prepared.name,
          size: file.size,
          mimeType: type,
        });
        if (result.error) problems.push(result.error);
      } catch {
        problems.push(NETWORK_ERROR);
      }
    }
    setUploading("");
    if (inputRef.current) inputRef.current.value = "";
    if (problems.length) setMessage(problems.join(" "));
    router.refresh();
  }

  async function download(entry: DriveEntry) {
    const result = await run(() => downloadFile(entry.id));
    if (result.url) window.location.assign(result.url);
  }

  const SortIcon = direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {folder ? (
            <>
              <Link href="/dashboard/fichiers" className="hover:text-foreground hover:underline">
                Mes fichiers
              </Link>
              <span aria-hidden="true">›</span>
              <span className="font-medium text-foreground">{folder.name}</span>
            </>
          ) : (
            <span className="font-medium text-foreground">Mes fichiers</span>
          )}
        </nav>
        <div className="flex flex-wrap gap-2">
          {!folder && (
            <Button variant="outline" onClick={() => setDialogue({ type: "new-folder" })}>
              <FolderPlus aria-hidden="true" />
              Nouveau dossier
            </Button>
          )}
          <Button onClick={() => inputRef.current?.click()} disabled={full || Boolean(uploading)}>
            <Upload aria-hidden="true" />
            Importer
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            aria-label="Choisir des fichiers à importer"
            onChange={(event) => void upload(event.target.files)}
          />
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Rechercher dans ce dossier"
          placeholder="Rechercher…"
          className="pl-8"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {uploading && (
        <p role="status" className="text-sm text-muted-foreground">
          {uploading}
        </p>
      )}
      {message && (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium" aria-sort={sortKey === "name" ? (direction === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("name")}>
                  Nom {sortKey === "name" && <SortIcon aria-hidden="true" className="size-3" />}
                </button>
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium" aria-sort={sortKey === "date" ? (direction === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("date")}>
                  Modifié le {sortKey === "date" && <SortIcon aria-hidden="true" className="size-3" />}
                </button>
              </th>
              <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Taille</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Statut</th>
              <th scope="col" className="w-10 px-2 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  {entries.length === 0
                    ? "Aucun fichier ici. Clique sur Importer."
                    : "Aucun résultat pour cette recherche."}
                </td>
              </tr>
            )}
            {visible.map((entry) => (
              <tr key={`${entry.kind}-${entry.id}`} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="max-w-0 px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <EntryIcon entry={entry} />
                    {entry.kind === "folder" ? (
                      <Link
                        href={`/dashboard/fichiers?dossier=${entry.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {entry.name}
                      </Link>
                    ) : (
                      <span className="truncate">{entry.name}</span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{formatDriveDate(entry.updatedAt)}</td>
                <td className="hidden whitespace-nowrap px-4 py-2.5 text-muted-foreground sm:table-cell">
                  {entry.size === null ? "—" : formatSize(entry.size)}
                </td>
                <td className="px-4 py-2.5">
                  {entry.kind === "file" &&
                    (entry.isPublic ? (
                      <Badge variant="success">
                        <Globe aria-hidden="true" /> Public
                      </Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Lock aria-hidden="true" className="size-3.5" /> Privé
                      </span>
                    ))}
                </td>
                <td className="px-2 py-2.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" />}
                      aria-label={`Actions pour ${entry.name}`}
                    >
                      <MoreVertical aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-48">
                      {entry.kind === "file" && (
                        <DropdownMenuItem onClick={() => void download(entry)}>
                          <Download aria-hidden="true" />
                          Télécharger
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setDialogue({ type: "rename", entry })}>
                        <Pencil aria-hidden="true" />
                        Renommer
                      </DropdownMenuItem>
                      {entry.kind === "file" && (
                        <DropdownMenuItem
                          onClick={() =>
                            entry.isPublic
                              ? void run(() => setFilePublic(entry.id, false))
                              : setDialogue({ type: "make-public", entry })
                          }
                        >
                          {entry.isPublic ? <Lock aria-hidden="true" /> : <Globe aria-hidden="true" />}
                          {entry.isPublic ? "Rendre privé" : "Rendre public"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDialogue({ type: "delete", entry })}>
                        <Trash2 aria-hidden="true" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-label="Stockage" className="space-y-1.5 rounded-xl border bg-card p-4">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium">Stockage</span>
          <span className={full ? "text-destructive" : "text-muted-foreground"}>
            {formatSize(usedBytes)} utilisés sur {formatSize(limitBytes)}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Stockage utilisé"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className={`h-full ${full ? "bg-destructive" : "bg-primary"}`} style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          Cette capacité est partagée avec ta photo de profil, les images de tes projets et les images de
          tes tableaux Kanban.
          {full && " Le stockage est plein : les imports sont bloqués."}
        </p>
      </section>

      {dialogue && (
        <DriveDialog
          dialogue={dialogue}
          onClose={() => setDialogue(null)}
          onDone={() => {
            setDialogue(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function DriveDialog({
  dialogue,
  onClose,
  onDone,
}: {
  dialogue: Dialogue;
  onClose: () => void;
  onDone: () => void;
}) {
  const initial = dialogue.type === "rename" ? dialogue.entry.name : "";
  const [name, setName] = useState(initial);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      let result: DriveActionResult;
      if (dialogue.type === "new-folder") result = await createFolder(name);
      else if (dialogue.type === "rename") {
        const { entry } = dialogue;
        result = entry.kind === "folder" ? await renameFolder(entry.id, name) : await renameFile(entry.id, name);
      } else if (dialogue.type === "make-public") result = await setFilePublic(dialogue.entry.id, true);
      else result = dialogue.entry.kind === "folder" ? await deleteFolder(dialogue.entry.id) : await deleteFile(dialogue.entry.id);
      if (result.error) setError(result.error);
      else onDone();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  const titles = {
    "new-folder": "Nouveau dossier",
    rename: "Renommer",
    "make-public": `Rendre « ${dialogue.type === "make-public" ? dialogue.entry.name : ""} » public ?`,
    delete: `Supprimer « ${dialogue.type === "delete" ? dialogue.entry.name : ""} » ?`,
  } as const;
  const asksName = dialogue.type === "new-folder" || dialogue.type === "rename";

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[dialogue.type]}</DialogTitle>
          {dialogue.type === "make-public" && (
            <DialogDescription>
              N’importe qui pourra télécharger ce fichier, et il apparaîtra dans « Ressources » sur ton profil.
            </DialogDescription>
          )}
          {dialogue.type === "delete" && (
            <DialogDescription>
              {dialogue.entry.kind === "folder"
                ? "Le dossier et tous les fichiers qu’il contient seront supprimés définitivement."
                : "Ce fichier sera supprimé définitivement."}
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          {asksName && (
            <div className="space-y-2">
              <Label htmlFor="drive-name">Nom</Label>
              <Input
                id="drive-name"
                autoFocus
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" variant={dialogue.type === "delete" ? "destructive" : "default"} disabled={pending}>
              {pending
                ? "Un instant…"
                : dialogue.type === "new-folder"
                  ? "Créer"
                  : dialogue.type === "rename"
                    ? "Enregistrer"
                    : dialogue.type === "make-public"
                      ? "Rendre public"
                      : "Supprimer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
