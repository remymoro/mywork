"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Globe,
  Lock,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { createBoard, deleteBoard, updateBoard } from "@/app/dashboard/kanban/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Switch } from "@/components/ui/switch";
import { BOARD_ICONS, type KanbanBoard, type KanbanCard } from "@/lib/kanban";
import { cn } from "@/lib/utils";

export const NETWORK_ERROR = "La connexion a été interrompue. Réessaie dans un instant.";

export function BoardEditor({
  board,
  onClose,
  onSaved,
}: {
  board?: KanbanBoard;
  onClose: () => void;
  onSaved: (slug?: string) => void;
}) {
  const [name, setName] = useState(board?.name ?? "");
  const [icon, setIcon] = useState(board?.icon ?? BOARD_ICONS[0].value);
  const [isPublic, setIsPublic] = useState(board?.is_public ?? false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const values = { name, icon, is_public: isPublic };
      const result = board ? await updateBoard(board.id, values) : await createBoard(values);
      if (result.error) setError(result.error);
      else onSaved(result.slug ?? board?.slug);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{board ? "Modifier le tableau" : "Nouveau tableau"}</DialogTitle>
          <DialogDescription>
            Donne un nom à ton tableau et choisis qui peut le voir.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="board-name">Nom du tableau</Label>
            <Input
              id="board-name"
              autoFocus
              maxLength={60}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Icône</legend>
            <div className="flex flex-wrap gap-2">
              {BOARD_ICONS.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={icon === value ? "default" : "outline"}
                  size="icon"
                  aria-label={label}
                  aria-pressed={icon === value}
                  title={label}
                  onClick={() => setIcon(value)}
                >
                  <Icon aria-hidden="true" />
                </Button>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="board-public">Tableau public</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {isPublic
                  ? "Visible par tous si ton profil est en ligne."
                  : "Visible uniquement par toi."}
              </p>
            </div>
            <Switch id="board-public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : board ? "Enregistrer" : "Créer le tableau"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BoardMenu({
  board,
  cardCount,
  username,
  horizontal = false,
  onSelect,
}: {
  board: KanbanBoard;
  cardCount: number;
  username: string;
  horizontal?: boolean;
  onSelect: (slug: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function changeVisibility() {
    setError("");
    setPending(true);
    try {
      const result = await updateBoard(board.id, { is_public: !board.is_public });
      if (result.error) setError(result.error);
      else router.refresh();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setError("");
    setPending(true);
    try {
      const result = await deleteBoard(board.id);
      if (result.error) setError(result.error);
      else {
        setDeleting(false);
        router.refresh();
      }
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${username}/kanban/${board.slug}`,
      );
      setCopied(true);
      setError("");
    } catch {
      setError("Impossible de copier le lien. Réessaie depuis le menu du tableau.");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" />}
          aria-label={`Menu du tableau ${board.name}`}
          disabled={pending}
        >
          {horizontal ? <MoreHorizontal aria-hidden="true" /> : <MoreVertical aria-hidden="true" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" />
            Renommer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditing(true)}>Changer l’icône</DropdownMenuItem>
          <DropdownMenuItem onClick={changeVisibility}>
            {board.is_public ? <Lock aria-hidden="true" /> : <Globe aria-hidden="true" />}
            {board.is_public ? "Passer en privé" : "Rendre public"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!board.is_public} closeOnClick={false} onClick={copyLink}>
            <Copy aria-hidden="true" />
            {copied ? "Lien copié" : "Copier le lien public"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setError("");
              setDeleting(true);
            }}
          >
            <Trash2 aria-hidden="true" />
            Supprimer le tableau
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && !deleting && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {editing && (
        <BoardEditor
          board={board}
          onClose={() => setEditing(false)}
          onSaved={(slug) => {
            setEditing(false);
            if (slug) onSelect(slug);
            router.refresh();
          }}
        />
      )}
      <Dialog open={deleting} onOpenChange={(open) => !pending && setDeleting(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer « {board.name} » ?</DialogTitle>
            <DialogDescription>
              Ce tableau et ses {cardCount} carte{cardCount === 1 ? "" : "s"} seront définitivement
              supprimés, avec leurs listes, checklists et commentaires.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)} disabled={pending}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BoardSidebar({
  boards,
  cards,
  selectedId,
  username,
  onSelect,
}: {
  boards: KanbanBoard[];
  cards: KanbanCard[];
  selectedId?: string;
  username: string;
  onSelect: (slug: string) => void;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <nav aria-label="Mes tableaux" className="space-y-4 md:border-r md:pr-5">
      <h2 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">
        MES TABLEAUX
      </h2>
      <Button className="w-full justify-start" onClick={() => setCreating(true)}>
        <Plus aria-hidden="true" />
        Nouveau
      </Button>
      <ul className="space-y-1">
        {boards.map((board) => {
          const Icon = (BOARD_ICONS.find((item) => item.value === board.icon) ?? BOARD_ICONS[0])
            .icon;
          const selected = board.id === selectedId;
          return (
            <li
              key={board.id}
              className={cn("flex flex-wrap items-center rounded-md p-1", selected && "bg-accent")}
            >
              <button
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => onSelect(board.slug)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-2 text-left text-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    selected ? "bg-primary" : "bg-transparent",
                  )}
                />
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{board.name}</span>
                {board.is_public ? (
                  <Globe
                    className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                    aria-label="Public"
                  />
                ) : (
                  <Lock
                    className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                    aria-label="Privé"
                  />
                )}
              </button>
              <BoardMenu
                board={board}
                cardCount={cards.filter((card) => card.board_id === board.id).length}
                username={username}
                onSelect={onSelect}
              />
            </li>
          );
        })}
      </ul>
      {boards.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Crée ton premier tableau pour organiser tes idées.
        </p>
      )}
      {creating && (
        <BoardEditor
          onClose={() => setCreating(false)}
          onSaved={(slug) => {
            setCreating(false);
            if (slug) onSelect(slug);
            router.refresh();
          }}
        />
      )}
    </nav>
  );
}
