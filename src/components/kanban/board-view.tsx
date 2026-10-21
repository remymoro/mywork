"use client";

import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  CheckSquare,
  CircleCheck,
  GripVertical,
  Image as ImageIcon,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createCard,
  createList,
  deleteCard,
  deleteList,
  moveCard,
  moveList,
  setDoneList,
  updateList,
} from "@/app/dashboard/kanban/actions";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  canEditCard,
  checklistProgress,
  doneListWarning,
  LIST_COLORS,
  MAX_CARDS,
  MAX_LISTS,
  type ChecklistItem,
  type KanbanBoard,
  type KanbanCard,
  type KanbanCardImage,
  type KanbanComment,
  type KanbanList,
  type KanbanPerson,
} from "@/lib/kanban";
import { cn } from "@/lib/utils";
import { BoardMenu, NETWORK_ERROR } from "./board-sidebar";

type ActionResult = { error?: string };
type Insertion = { id: string; after: boolean } | null;

export function QuickAddCard({
  boardId,
  listId,
  count,
}: {
  boardId: string;
  listId: string;
  count: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const full = count >= MAX_CARDS;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || full || !title.trim()) return;
    setPending(true);
    setError("");
    try {
      const result = await createCard(boardId, listId, title);
      if (result.error) setError(result.error);
      else {
        setTitle("");
        router.refresh();
      }
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 p-3 pt-1">
      {open && !full ? (
        <form onSubmit={submit} className="space-y-2">
          <Input
            aria-label="Titre de la nouvelle carte"
            autoFocus
            maxLength={150}
            placeholder="Que faut-il faire ?"
            value={title}
            readOnly={pending}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                setTitle("");
                setError("");
              }
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void submit(event);
              }
            }}
          />
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending || !title.trim()}>
              Ajouter
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Fermer
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Entrée pour ajouter · Échap pour fermer</p>
        </form>
      ) : (
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setOpen(true)}
          disabled={full}
          aria-describedby={full ? `full-${listId}` : undefined}
        >
          <Plus aria-hidden="true" />
          Carte
        </Button>
      )}
      {full && (
        <p id={`full-${listId}`} className="text-xs text-muted-foreground">
          Cette liste est pleine : 20 cartes au maximum
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function ListEditor({
  boardId,
  list,
  onClose,
}: {
  boardId: string;
  list?: KanbanList;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(list?.title ?? "");
  const [color, setColor] = useState(list?.color ?? LIST_COLORS[0].value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = list
        ? await updateList(boardId, list.id, { title, color })
        : await createList(boardId, { title, color });
      if (result.error) setError(result.error);
      else {
        onClose();
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
          <DialogTitle>{list ? "Renommer la liste" : "Ajouter une liste"}</DialogTitle>
          <DialogDescription>Choisis son titre et sa couleur.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="list-title">Titre de la liste</Label>
            <Input
              id="list-title"
              autoFocus
              required
              maxLength={60}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Couleur</legend>
            <div className="flex flex-wrap gap-2">
              {LIST_COLORS.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  variant="outline"
                  aria-pressed={color === item.value}
                  className={cn(item.headerClass, color === item.value && "ring-2 ring-primary")}
                  onClick={() => setColor(item.value)}
                >
                  <span className={cn("size-2 rounded-full", item.dotClass)} aria-hidden="true" />
                  {item.label}
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
              {list ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CardTile({
  card,
  checklist,
  commentCount,
  imageCount = 0,
  coverUrl,
  readOnly,
  disabled,
  insertion,
  onOpen,
  onDelete,
}: {
  card: KanbanCard;
  checklist: ChecklistItem[];
  commentCount: number;
  imageCount?: number;
  /** Aperçu affiché en haut de la carte : la première image (adresse signée). */
  coverUrl?: string;
  readOnly: boolean;
  disabled: boolean;
  insertion: Insertion;
  onOpen: (id: string) => void;
  onDelete: (card: KanbanCard) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card:${card.id}`,
    data: { type: "card", card },
    disabled: readOnly || disabled,
  });
  const progress = checklistProgress(checklist);
  const highlighted = insertion?.id === `card:${card.id}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "opacity-35")}
    >
      {highlighted && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute right-0 left-0 z-10 h-1 rounded-full bg-primary",
            insertion.after ? "-bottom-1.5" : "-top-1.5",
          )}
        />
      )}
      <article className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-xs hover:border-primary/30">
        {coverUrl && (
          // Clic sur l'aperçu : ouvre la carte, comme sur son titre.
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => onOpen(card.id)}
            className="block w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- adresse signée temporaire */}
            <img
              src={coverUrl}
              alt=""
              loading="lazy"
              draggable={false}
              className="aspect-video w-full border-b object-cover"
            />
          </button>
        )}
        <div className="p-3">
          <div className="flex items-start gap-1">
            <button
              type="button"
              className="min-w-0 flex-1 rounded text-left text-sm leading-relaxed break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => onOpen(card.id)}
            >
              {card.title}
            </button>
            {!readOnly && (
              <>
                <button
                  ref={setActivatorNodeRef}
                  type="button"
                  {...attributes}
                  {...listeners}
                  aria-label={`Déplacer la carte ${card.title}`}
                  title="Espace pour attraper, flèches pour déplacer, Espace pour poser"
                  className="touch-none rounded p-1 text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <GripVertical aria-hidden="true" className="size-3.5" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-xs" />}
                    aria-label={`Menu de la carte ${card.title}`}
                  >
                    <MoreHorizontal aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-36">
                    <DropdownMenuItem onClick={() => onOpen(card.id)}>Ouvrir</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(card)}>
                      <Trash2 aria-hidden="true" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
          {(card.description || commentCount > 0 || imageCount > 0 || progress.total > 0) && (
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              {card.description && (
                <span title="Description" aria-label="Avec une description">
                  <AlignLeft aria-hidden="true" className="size-3.5" />
                </span>
              )}
              {commentCount > 0 && (
                <span
                  className="flex items-center gap-1"
                  aria-label={`${commentCount} commentaires`}
                >
                  <MessageSquare aria-hidden="true" className="size-3.5" />
                  {commentCount}
                </span>
              )}
              {imageCount > 0 && (
                <span className="flex items-center gap-1" aria-label={`${imageCount} images`}>
                  <ImageIcon aria-hidden="true" className="size-3.5" />
                  {imageCount}
                </span>
              )}
              {progress.total > 0 && (
                <span
                  className={cn("flex items-center gap-1", progress.complete && "text-success")}
                  aria-label={`${progress.done} éléments cochés sur ${progress.total}`}
                >
                  <CheckSquare aria-hidden="true" className="size-3.5" />
                  {progress.done}/{progress.total}
                </span>
              )}
            </div>
          )}
        </div>
      </article>
    </li>
  );
}

export function ListColumn({
  list,
  cards,
  checklist,
  comments,
  images = [],
  isOwner = true,
  userId = "",
  disabled = false,
  insertion = null,
  onOpen,
  onError,
}: {
  list: KanbanList;
  cards: KanbanCard[];
  checklist: ChecklistItem[];
  comments: KanbanComment[];
  images?: KanbanCardImage[];
  /** Propriétaire du tableau : lui seul gère les listes. */
  isOwner?: boolean;
  userId?: string;
  disabled?: boolean;
  insertion?: Insertion;
  onOpen: (id: string) => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);
  const color = LIST_COLORS.find((item) => item.value === list.color) ?? LIST_COLORS[0];
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `list:${list.id}`,
    data: { type: "list", list },
    disabled: !isOwner || disabled,
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: `drop:${list.id}`,
    data: { type: "drop", list, cardCount: cards.length },
    disabled,
  });

  async function run(action: () => Promise<ActionResult>) {
    setPending(true);
    onError("");
    try {
      const result = await action();
      if (result.error) onError(result.error);
      else {
        setDeleting(false);
        router.refresh();
      }
    } catch {
      onError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      ref={setNodeRef}
      aria-label={`Liste ${list.title}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "w-[min(18rem,100%)] shrink-0 self-start rounded-xl border bg-muted/25",
        isDragging && "opacity-35",
        insertion?.id === `list:${list.id}` && "ring-2 ring-primary",
      )}
    >
      <header className={cn("flex items-center gap-2 rounded-t-xl px-3 py-3", color.headerClass)}>
        <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", color.dotClass)} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading text-lg font-medium">{list.title}</h3>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {cards.length} carte{cards.length === 1 ? "" : "s"}
            {list.is_done_list && (
              <span
                className="flex items-center gap-1 font-medium text-success"
                title="Liste de fin"
              >
                <CircleCheck aria-hidden="true" className="size-3.5" />
                Liste de fin
              </span>
            )}
          </p>
        </div>
        {isOwner && (
          <>
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={`Déplacer la liste ${list.title}`}
              title="Espace pour attraper, flèches pour déplacer, Espace pour poser"
              className="touch-none rounded p-1 text-muted-foreground hover:bg-background/50 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <GripVertical aria-hidden="true" className="size-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" />}
                aria-label={`Menu de la liste ${list.title}`}
                disabled={pending}
              >
                <MoreVertical aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onClick={() => setEditing(true)}>Renommer</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Couleur</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={list.color}
                      onValueChange={(value) => {
                        const selected = LIST_COLORS.find((item) => item.value === value);
                        if (selected)
                          void run(() =>
                            updateList(list.board_id, list.id, { color: selected.value }),
                          );
                      }}
                    >
                      {LIST_COLORS.map((item) => (
                        <DropdownMenuRadioItem key={item.value} value={item.value}>
                          <span className={cn("size-2 rounded-full", item.dotClass)} />
                          {item.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  onClick={() =>
                    void run(() => setDoneList(list.board_id, list.id, !list.is_done_list))
                  }
                >
                  <CircleCheck aria-hidden="true" />
                  {list.is_done_list ? "Ne plus être la liste de fin" : "En faire la liste de fin"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                  <Trash2 aria-hidden="true" />
                  Supprimer la liste
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </header>
      <div
        ref={setDropRef}
        className={cn(
          "min-h-20 p-3",
          insertion?.id === `drop:${list.id}` &&
            "rounded border-2 border-dashed border-primary bg-accent/40",
        )}
      >
        <SortableContext
          items={cards.map((card) => `card:${card.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {cards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                checklist={checklist.filter((item) => item.card_id === card.id)}
                commentCount={comments.filter((comment) => comment.card_id === card.id).length}
                imageCount={images.filter((image) => image.card_id === card.id).length}
                coverUrl={
                  images
                    .filter((image) => image.card_id === card.id)
                    .sort((a, b) => a.position - b.position)[0]?.url
                }
                readOnly={!canEditCard({ isOwner, userId, authorId: card.author_profile_id })}
                disabled={disabled}
                insertion={insertion}
                onOpen={onOpen}
                onDelete={(item) => void run(() => deleteCard(list.board_id, item.id))}
              />
            ))}
          </ul>
        </SortableContext>
        {cards.length === 0 && (
          <p className="py-3 text-center text-xs text-muted-foreground">
            Aucune carte pour le moment.
          </p>
        )}
      </div>
      <QuickAddCard boardId={list.board_id} listId={list.id} count={cards.length} />
      {editing && (
        <ListEditor boardId={list.board_id} list={list} onClose={() => setEditing(false)} />
      )}
      <Dialog open={deleting} onOpenChange={(open) => !pending && setDeleting(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer « {list.title} » ?</DialogTitle>
            <DialogDescription>
              Cette liste et ses {cards.length} carte{cards.length === 1 ? "" : "s"} seront
              définitivement supprimées, avec leurs checklists et commentaires.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)} disabled={pending}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => void run(() => deleteList(list.board_id, list.id))}
              disabled={pending}
            >
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// Les listes ne rencontrent que des listes ; les cartes rencontrent les cartes
// et les zones de dépôt, y compris celles des listes encore vides.
const detectCollision: CollisionDetection = (args) => {
  const movingList = args.active.data.current?.type === "list";
  const droppableContainers = args.droppableContainers.filter((container) => {
    const type = container.data.current?.type;
    return movingList ? type === "list" : type === "card" || type === "drop";
  });
  const collisions = pointerWithin({ ...args, droppableContainers });
  const cards = collisions.filter((item) => String(item.id).startsWith("card:"));
  return cards.length
    ? cards
    : collisions.length
      ? collisions
      : closestCenter({ ...args, droppableContainers });
};

// On écarte les poignées de listes lorsqu'on déplace une carte au clavier.
// Une liste vide reste une destination possible grâce à sa zone de dépôt.
export const kanbanKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) return;
  event.preventDefault();
  const { active, collisionRect, droppableContainers, droppableRects } = context;
  if (!active || !collisionRect) return;
  const movingList = active.data.current?.type === "list";
  const horizontal = event.code === "ArrowLeft" || event.code === "ArrowRight";
  const forward = event.code === "ArrowDown" || event.code === "ArrowRight";
  const candidates = droppableContainers.getEnabled().flatMap((container) => {
    const type = container.data.current?.type;
    const relevant = movingList
      ? type === "list"
      : type === "card" || (type === "drop" && container.data.current?.cardCount === 0);
    const rect = droppableRects.get(container.id);
    if (!relevant || !rect) return [];
    const delta = horizontal ? rect.left - collisionRect.left : rect.top - collisionRect.top;
    if ((forward && delta <= 1) || (!forward && delta >= -1)) return [];
    const crossDelta = horizontal ? rect.top - collisionRect.top : rect.left - collisionRect.left;
    return [{ rect, distance: Math.abs(delta) + Math.abs(crossDelta) * 2 }];
  });
  candidates.sort((a, b) => a.distance - b.distance);
  const target = candidates[0]?.rect;
  return target ? { x: target.left, y: target.top } : undefined;
};

export function BoardView({
  board,
  lists,
  cards,
  checklist,
  comments,
  images = [],
  people = [],
  userId,
  onOpen,
  onSelect,
}: {
  board: KanbanBoard;
  lists: KanbanList[];
  cards: KanbanCard[];
  checklist: ChecklistItem[];
  comments: KanbanComment[];
  images?: KanbanCardImage[];
  people?: KanbanPerson[];
  userId: string;
  onOpen: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const isOwner = board.owner_id === userId;
  const [visibleLists, setOptimisticLists] = useOptimistic(lists);
  const [visibleCards, setOptimisticCards] = useOptimistic(cards);
  const [pending, startTransition] = useTransition();
  const [addingList, setAddingList] = useState(false);
  const [error, setError] = useState("");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [insertion, setInsertion] = useState<Insertion>(null);
  const [confirmMove, setConfirmMove] = useState<{
    title: string;
    message: string;
    commit: () => void;
  } | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: kanbanKeyboardCoordinates }),
  );

  function showInsertion({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) {
      setInsertion(null);
      return;
    }
    const translated = active.rect.current.translated;
    const movingCard = active.data.current?.card as KanbanCard | undefined;
    const targetCard = over.data.current?.card as KanbanCard | undefined;
    const after =
      movingCard && targetCard && movingCard.list_id === targetCard.list_id
        ? movingCard.position < targetCard.position
        : !!translated &&
          translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2;
    setInsertion({ id: String(over.id), after });
  }

  function finishDrag({ active, over }: DragEndEvent) {
    setActiveLabel(null);
    setInsertion(null);
    if (!over || over.id === active.id || pending) return;
    setError("");
    const sortedLists = [...visibleLists].sort((a, b) => a.position - b.position);
    if (active.data.current?.type === "list") {
      const from = sortedLists.findIndex((list) => `list:${list.id}` === active.id);
      const to = sortedLists.findIndex((list) => `list:${list.id}` === over.id);
      if (from < 0 || to < 0) return;
      startTransition(async () => {
        setOptimisticLists(
          arrayMove(sortedLists, from, to).map((list, position) => ({ ...list, position })),
        );
        try {
          const result = await moveList(board.id, sortedLists[from].id, to);
          if (result.error) setError(result.error);
          else router.refresh();
        } catch {
          setError(NETWORK_ERROR);
        }
      });
      return;
    }
    const card = visibleCards.find((item) => `card:${item.id}` === active.id);
    const overCard = visibleCards.find((item) => `card:${item.id}` === over.id);
    const targetListId =
      overCard?.list_id ?? (over.data.current?.list as KanbanList | undefined)?.id;
    if (!card || !targetListId) return;
    const targetCards = visibleCards
      .filter((item) => item.list_id === targetListId && item.id !== card.id)
      .sort((a, b) => a.position - b.position);
    let targetIndex = overCard
      ? targetCards.findIndex((item) => item.id === overCard.id)
      : targetCards.length;
    if (overCard && insertion?.id === String(over.id) && insertion.after) targetIndex += 1;
    targetIndex = Math.max(0, targetIndex);
    const moved = { ...card, list_id: targetListId };
    targetCards.splice(targetIndex, 0, moved);
    const sourceCards = visibleCards
      .filter((item) => item.list_id === card.list_id && item.id !== card.id)
      .sort((a, b) => a.position - b.position);
    const unaffected = visibleCards.filter(
      (item) => item.list_id !== targetListId && item.list_id !== card.list_id,
    );
    const nextCards = [
      ...unaffected,
      ...(targetListId === card.list_id
        ? []
        : sourceCards.map((item, position) => ({ ...item, position }))),
      ...targetCards.map((item, position) => ({ ...item, position })),
    ];
    const commit = () =>
      startTransition(async () => {
        setOptimisticCards(nextCards);
        try {
          const result = await moveCard(board.id, card.id, targetListId, targetIndex);
          if (result.error) setError(result.error);
          else router.refresh();
        } catch {
          setError(NETWORK_ERROR);
        }
      });

    // Liste de fin et checklist inachevée : on demande confirmation (avertir, pas bloquer).
    const source = visibleLists.find((list) => list.id === card.list_id);
    const target = visibleLists.find((list) => list.id === targetListId);
    const warning =
      source && target
        ? doneListWarning(
            checklist.filter((item) => item.card_id === card.id),
            source,
            target,
          )
        : null;
    if (warning) setConfirmMove({ title: card.title, message: warning, commit });
    else commit();
  }

  const columns = (
    <div className="flex items-start gap-5 overflow-x-auto px-1 pt-1 pb-5">
      <SortableContext
        items={[...visibleLists]
          .sort((a, b) => a.position - b.position)
          .map((list) => `list:${list.id}`)}
        strategy={horizontalListSortingStrategy}
      >
        {[...visibleLists]
          .sort((a, b) => a.position - b.position)
          .map((list) => (
            <ListColumn
              key={list.id}
              list={list}
              cards={visibleCards
                .filter((card) => card.list_id === list.id)
                .sort((a, b) => a.position - b.position)}
              checklist={checklist}
              comments={comments}
              images={images}
              isOwner={isOwner}
              userId={userId}
              disabled={pending}
              insertion={insertion}
              onOpen={onOpen}
              onError={setError}
            />
          ))}
      </SortableContext>
    </div>
  );

  return (
    <section aria-label={`Tableau ${board.name}`} className="min-w-0 space-y-5">
      <header className="flex items-center justify-between gap-3 border-b pb-4">
        <h2 className="text-xs font-semibold tracking-[0.16em] uppercase">
          Tableau : {board.name}
        </h2>
        <BoardMenu
          board={board}
          cardCount={cards.length}
          people={people}
          userId={userId}
          horizontal
          onSelect={onSelect}
        />
      </header>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {error}
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => {
                setError("");
                router.refresh();
              }}
            >
              Actualiser
            </button>
          </AlertDescription>
        </Alert>
      )}
      {visibleLists.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          {isOwner
            ? "Ton tableau est prêt. Ajoute une première liste pour commencer."
            : "Ce tableau ne contient pas encore de liste : seul son propriétaire peut en créer."}
        </p>
      )}
      {(
        <DndContext
          id={`kanban-${board.id}`}
          sensors={sensors}
          collisionDetection={detectCollision}
          onDragStart={({ active }) =>
            setActiveLabel(
              active.data.current?.card?.title ?? active.data.current?.list?.title ?? "",
            )
          }
          onDragOver={showInsertion}
          onDragMove={showInsertion}
          onDragCancel={() => {
            setActiveLabel(null);
            setInsertion(null);
          }}
          onDragEnd={finishDrag}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                "Appuie sur Espace pour attraper. Utilise les flèches pour déplacer. Appuie sur Espace pour poser, ou sur Échap pour annuler.",
            },
            announcements: {
              onDragStart: () => "Élément attrapé. Utilise les flèches pour le déplacer.",
              onDragOver: ({ over }) =>
                over ? "Nouvelle position sélectionnée." : "Aucune position sélectionnée.",
              onDragEnd: () => "Élément posé.",
              onDragCancel: () => "Déplacement annulé.",
            },
          }}
        >
          {columns}
          <DragOverlay>
            {activeLabel && (
              <div className="max-w-72 rounded-lg border-2 border-primary bg-card p-4 text-sm shadow-lg">
                {activeLabel}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
      {isOwner && (
        <div className="space-y-2">
          <Button
            variant="outline"
            disabled={visibleLists.length >= MAX_LISTS}
            onClick={() => setAddingList(true)}
            aria-describedby={visibleLists.length >= MAX_LISTS ? "list-limit" : undefined}
          >
            <Plus aria-hidden="true" />
            Ajouter une liste
          </Button>
          {visibleLists.length >= MAX_LISTS && (
            <p id="list-limit" className="text-xs text-muted-foreground">
              5 listes au maximum
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Pour déplacer une liste ou une carte au clavier : place-toi sur sa poignée, puis Espace,
            flèches, Espace.
          </p>
        </div>
      )}
      {addingList && <ListEditor boardId={board.id} onClose={() => setAddingList(false)} />}
      <Dialog open={confirmMove !== null} onOpenChange={(open) => !open && setConfirmMove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Déplacer « {confirmMove?.title} » dans la liste de fin ?</DialogTitle>
            <DialogDescription>{confirmMove?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmMove(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                confirmMove?.commit();
                setConfirmMove(null);
              }}
            >
              Déplacer quand même
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
