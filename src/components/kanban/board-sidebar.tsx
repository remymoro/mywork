"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  createBoard,
  deleteBoard,
  inviteMember,
  removeMember,
  updateBoard,
} from "@/app/dashboard/kanban/actions";
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
  BOARD_ICONS,
  MAX_BOARDS,
  MAX_MEMBERS,
  personName,
  type KanbanBoard,
  type KanbanCard,
  type KanbanPerson,
} from "@/lib/kanban";
import { cn } from "@/lib/utils";

export const NETWORK_ERROR = "La connexion a été interrompue. Réessaie dans un instant.";

export function BoardEditor({
  board,
  onClose,
  onSaved,
}: {
  board?: KanbanBoard;
  onClose: () => void;
  onSaved: (id?: string) => void;
}) {
  const [name, setName] = useState(board?.name ?? "");
  const [icon, setIcon] = useState(board?.icon ?? BOARD_ICONS[0].value);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const values = { name, icon };
      const result = board ? await updateBoard(board.id, values) : await createBoard(values);
      if (result.error) setError(result.error);
      else onSaved(result.id ?? board?.id);
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
            Un tableau est privé : toi seul le vois, et les membres que tu invites.
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

/** Partager un tableau : membres actuels, ajout par pseudo, retrait (propriétaire seul). */
export function ShareDialog({
  board,
  people,
  onClose,
}: {
  board: KanbanBoard;
  people: KanbanPerson[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const members = people.filter((person) => !person.is_owner);
  const full = members.length >= MAX_MEMBERS;

  async function run(action: () => Promise<{ error?: string }>, onDone?: () => void) {
    setPending(true);
    setError("");
    try {
      const result = await action();
      if (result.error) setError(result.error);
      else {
        onDone?.();
        router.refresh();
      }
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
          <DialogTitle>Partager « {board.name} »</DialogTitle>
          <DialogDescription>
            Les membres voient tout le tableau, créent leurs cartes et commentent. Ils ne peuvent
            modifier que leurs propres cartes.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () => inviteMember(board.id, username),
              () => setUsername(""),
            );
          }}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="share-username">Pseudo de la personne</Label>
            <Input
              id="share-username"
              placeholder="ex. louise-dubois"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={pending || full}
            />
          </div>
          <Button type="submit" disabled={pending || full || !username.trim()}>
            <UserPlus aria-hidden="true" />
            Inviter
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          {full
            ? `${MAX_MEMBERS} membres au maximum : retire quelqu'un pour en inviter un autre.`
            : `${members.length}/${MAX_MEMBERS} membres.`}
        </p>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <ul aria-label="Personnes du tableau" className="divide-y rounded-lg border">
          {people.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 text-sm">
                <span className="font-medium">{personName(person)}</span>{" "}
                <span className="text-muted-foreground">@{person.username}</span>
              </span>
              {person.is_owner ? (
                <Badge variant="secondary">Propriétaire</Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Retirer ${personName(person)}`}
                  disabled={pending}
                  onClick={() => void run(() => removeMember(board.id, person.id))}
                >
                  <UserMinus aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BoardMenu({
  board,
  cardCount,
  people,
  userId,
  horizontal = false,
  onSelect,
}: {
  board: KanbanBoard;
  cardCount: number;
  people: KanbanPerson[];
  userId: string;
  horizontal?: boolean;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const isOwner = board.owner_id === userId;
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<{ error?: string }>, onDone: () => void) {
    setError("");
    setPending(true);
    try {
      const result = await action();
      if (result.error) setError(result.error);
      else {
        onDone();
        router.refresh();
      }
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
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
          {isOwner ? (
            <>
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" />
                Renommer ou changer l’icône
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSharing(true)}>
                <Users aria-hidden="true" />
                Partager
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
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => setSharing(true)}>
                <Users aria-hidden="true" />
                Voir les membres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setLeaving(true)}>
                <LogOut aria-hidden="true" />
                Quitter le tableau
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && !deleting && !leaving && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {editing && (
        <BoardEditor
          board={board}
          onClose={() => setEditing(false)}
          onSaved={(id) => {
            setEditing(false);
            if (id) onSelect(id);
            router.refresh();
          }}
        />
      )}
      {sharing && isOwner && (
        <ShareDialog board={board} people={people} onClose={() => setSharing(false)} />
      )}
      {sharing && !isOwner && (
        <Dialog open onOpenChange={(open) => !open && setSharing(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Membres de « {board.name} »</DialogTitle>
            </DialogHeader>
            <ul className="divide-y rounded-lg border">
              {people.map((person) => (
                <li key={person.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium">{personName(person)}</span>{" "}
                    <span className="text-muted-foreground">@{person.username}</span>
                  </span>
                  {person.is_owner && <Badge variant="secondary">Propriétaire</Badge>}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSharing(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={deleting} onOpenChange={(open) => !pending && setDeleting(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer « {board.name} » ?</DialogTitle>
            <DialogDescription>
              Ce tableau et ses {cardCount} carte{cardCount === 1 ? "" : "s"} seront définitivement
              supprimés, avec leurs listes, checklists, images et commentaires, aussi pour ses
              membres.
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
            <Button
              variant="destructive"
              onClick={() => void run(() => deleteBoard(board.id), () => setDeleting(false))}
              disabled={pending}
            >
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={leaving} onOpenChange={(open) => !pending && setLeaving(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quitter « {board.name} » ?</DialogTitle>
            <DialogDescription>
              Tu ne verras plus ce tableau. Tes cartes et commentaires y restent ; le propriétaire
              pourra te réinviter.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaving(false)} disabled={pending}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => void run(() => removeMember(board.id, userId), () => setLeaving(false))}
              disabled={pending}
            >
              Quitter le tableau
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
  people,
  selectedId,
  userId,
  onSelect,
}: {
  boards: KanbanBoard[];
  cards: KanbanCard[];
  people: KanbanPerson[];
  selectedId?: string;
  userId: string;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const ownedCount = boards.filter((board) => board.owner_id === userId).length;
  const full = ownedCount >= MAX_BOARDS;

  return (
    <nav aria-label="Mes tableaux" className="space-y-4 border-b pb-5 lg:border-r lg:border-b-0 lg:pr-5 lg:pb-0">
      <h2 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">
        MES TABLEAUX
      </h2>
      <Button className="w-full justify-start" disabled={full} onClick={() => setCreating(true)}>
        <Plus aria-hidden="true" />
        Nouveau
      </Button>
      {full && (
        <p className="text-xs text-muted-foreground">
          {MAX_BOARDS} tableaux au maximum : supprime-en un pour en créer un autre.
        </p>
      )}
      <ul className="space-y-1">
        {boards.map((board) => {
          const Icon = (BOARD_ICONS.find((item) => item.value === board.icon) ?? BOARD_ICONS[0])
            .icon;
          const selected = board.id === selectedId;
          const shared = board.owner_id !== userId;
          const boardPeople = people.filter((person) => person.board_id === board.id);
          const owner = boardPeople.find((person) => person.is_owner);
          return (
            <li
              key={board.id}
              className={cn("flex flex-wrap items-center rounded-md p-1", selected && "bg-accent")}
            >
              <button
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => onSelect(board.id)}
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
                <span className="min-w-0">
                  <span className="block truncate">{board.name}</span>
                  {shared && owner && (
                    <span className="block truncate text-xs text-muted-foreground">
                      de {personName(owner)}
                    </span>
                  )}
                </span>
                {(shared || boardPeople.length > 1) && (
                  <Users
                    className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                    aria-label="Tableau partagé"
                  />
                )}
              </button>
              <BoardMenu
                board={board}
                cardCount={cards.filter((card) => card.board_id === board.id).length}
                people={boardPeople}
                userId={userId}
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
          onSaved={(id) => {
            setCreating(false);
            if (id) onSelect(id);
            router.refresh();
          }}
        />
      )}
    </nav>
  );
}
