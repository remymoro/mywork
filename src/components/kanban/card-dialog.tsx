"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CARD_TITLE_MAX,
  CHECKLIST_TEXT_MAX,
  COMMENT_MAX,
  DESCRIPTION_MAX,
  MAX_CHECKLIST_ITEMS,
  canEditCard,
  checklistProgress,
  type ChecklistItem,
  type KanbanCardImage,
  type KanbanCard,
  type KanbanComment,
  type KanbanList,
} from "@/lib/kanban";
import {
  addChecklistItem,
  addComment,
  deleteChecklistItem,
  deleteComment,
  setChecklistItemDone,
  updateCard,
} from "@/app/dashboard/kanban/actions";
import { CardImages } from "./card-images";
import { Markdown } from "./markdown";

type Format = "bold" | "italic" | "link" | "bullet" | "numbered" | "heading";

const FORMATS = [
  { value: "bold", label: "Gras", shortcut: "Ctrl/⌘ + B", icon: Bold },
  { value: "italic", label: "Italique", shortcut: "Ctrl/⌘ + I", icon: Italic },
  { value: "link", label: "Lien", shortcut: "Ctrl/⌘ + K", icon: Link },
  { value: "bullet", label: "Liste à puces", shortcut: "- élément", icon: List },
  { value: "numbered", label: "Liste numérotée", shortcut: "1. élément", icon: ListOrdered },
  { value: "heading", label: "Titre", shortcut: "## Titre", icon: Heading2 },
] as const;

export type CardDialogProps = {
  card: KanbanCard;
  list: KanbanList;
  checklist: ChecklistItem[];
  comments: KanbanComment[];
  images?: KanbanCardImage[];
  userId: string;
  /** Propriétaire du tableau : il modifie toutes les cartes et supprime tous les commentaires. */
  isOwner: boolean;
  onClose: () => void;
};

/** Le parent utilise la carte comme clé pour repartir de sa saisie quand on en ouvre une autre. */
export function CardDialog({
  card,
  list,
  checklist,
  comments,
  images = [],
  userId,
  isOwner,
  onClose,
}: CardDialogProps) {
  const router = useRouter();
  // Un membre voit et commente toutes les cartes, mais ne modifie que les siennes.
  const readOnly = !canEditCard({ isOwner, userId, authorId: card.author_profile_id });
  const [savedTitle, setSavedTitle] = useState(card.title);
  const [title, setTitle] = useState(card.title);
  const [savedDescription, setSavedDescription] = useState(card.description);
  const [description, setDescription] = useState(card.description);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const progress = checklistProgress(checklist);

  async function run(action: () => Promise<{ error?: string }>, onSaved?: () => void) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (result.error) setError(result.error);
      else {
        onSaved?.();
        router.refresh();
      }
    } catch {
      setError("La connexion a été interrompue. Réessaie : ta saisie est conservée.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function saveTitle() {
    void run(
      () => updateCard(card.board_id, card.id, { title, description: savedDescription }),
      () => {
        setSavedTitle(title.trim());
        setEditingTitle(false);
      },
    );
  }

  function saveDescription() {
    void run(
      () => updateCard(card.board_id, card.id, { title: savedTitle, description }),
      () => {
        setSavedDescription(description.trim());
        setEditingDescription(false);
      },
    );
  }

  function cancelDescription() {
    setDescription(savedDescription);
    setEditingDescription(false);
    setError(null);
  }

  function applyFormat(format: Format) {
    const textarea = descriptionRef.current;
    if (!textarea || pending) return;
    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;
    let replacement: string;
    let selectionStart: number;
    let selectionEnd: number;
    if (format === "bullet" || format === "numbered" || format === "heading") {
      start = description.lastIndexOf("\n", start - 1) + 1;
      const nextNewline = description.indexOf("\n", end);
      end = nextNewline === -1 ? description.length : nextNewline;
      const prefix = format === "bullet" ? "- " : format === "numbered" ? "1. " : "## ";
      replacement = description
        .slice(start, end)
        .split("\n")
        .map((line) => `${prefix}${line}`)
        .join("\n");
      selectionStart = start + prefix.length;
      selectionEnd = start + replacement.length;
    } else {
      const selected = description.slice(start, end) || "texte";
      const prefix = format === "bold" ? "**" : format === "italic" ? "*" : "[";
      const suffix = format === "link" ? "](https://exemple.fr)" : prefix;
      replacement = `${prefix}${selected}${suffix}`;
      selectionStart = start + prefix.length;
      selectionEnd = selectionStart + selected.length;
      if (format === "link") {
        selectionStart = start + prefix.length + selected.length + 2;
        selectionEnd = start + replacement.length - 1;
      }
    }
    setDescription(description.slice(0, start) + replacement + description.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function handleDescriptionKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (!pending) cancelDescription();
    } else if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === "enter") {
        event.preventDefault();
        saveDescription();
      } else if (key === "b" || key === "i" || key === "k") {
        event.preventDefault();
        applyFormat(key === "b" ? "bold" : key === "i" ? "italic" : "link");
      }
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open, details) => {
        if (open) return;
        if (details.reason === "escape-key" && (editingDescription || editingTitle)) {
          details.cancel();
          if (!pending) {
            cancelDescription();
            setTitle(savedTitle);
            setEditingTitle(false);
          }
          return;
        }
        onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto p-6 sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-3"
              aria-label="Fermer la carte"
            />
          }
        >
          <X aria-hidden="true" />
        </DialogClose>
        <DialogHeader className="pr-7">
          <DialogTitle className="font-heading text-2xl leading-tight">{savedTitle}</DialogTitle>
          <DialogDescription>dans la liste {list.title}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {readOnly && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            Cette carte appartient à quelqu&apos;un d&apos;autre : tu peux la commenter, mais seuls
            son auteur et le propriétaire du tableau peuvent la modifier.
          </p>
        )}

        {!readOnly &&
          (editingTitle ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveTitle();
              }}
              className="space-y-2"
            >
              <label htmlFor="card-title" className="text-sm font-medium">
                Titre de la carte
              </label>
              <Input
                id="card-title"
                value={title}
                maxLength={CARD_TITLE_MAX}
                onChange={(event) => setTitle(event.target.value)}
                disabled={pending}
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  Enregistrer le titre
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setTitle(savedTitle);
                    setEditingTitle(false);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="w-fit"
              onClick={() => setEditingTitle(true)}
            >
              <Pencil aria-hidden="true" />
              Modifier le titre
            </Button>
          ))}

        <section className="space-y-3 border-t pt-4" aria-labelledby="card-description-heading">
          <div className="flex items-center justify-between gap-2">
            <h3 id="card-description-heading" className="font-heading text-xl">
              Description
            </h3>
            {!readOnly && !editingDescription && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingDescription(true)}
              >
                <Pencil aria-hidden="true" />
                {savedDescription ? "Modifier la description" : "Ajouter une description"}
              </Button>
            )}
          </div>
          {editingDescription ? (
            <div className="space-y-2">
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label="Mise en forme de la description"
              >
                {FORMATS.map((format) => (
                  <Button
                    key={format.value}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={format.label}
                    title={`${format.label} (${format.shortcut})`}
                    disabled={pending}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyFormat(format.value)}
                  >
                    <format.icon aria-hidden="true" />
                  </Button>
                ))}
              </div>
              <Textarea
                ref={descriptionRef}
                aria-label="Description de la carte"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onKeyDown={handleDescriptionKey}
                maxLength={DESCRIPTION_MAX}
                className="min-h-40"
                disabled={pending}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Entrée : retour à la ligne · Ctrl/⌘ + Entrée : enregistrer · Échap : annuler
              </p>
              <div className="flex gap-2">
                <Button type="button" disabled={pending} onClick={saveDescription}>
                  Enregistrer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={cancelDescription}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : savedDescription ? (
            <Markdown text={savedDescription} />
          ) : (
            <p className="text-sm text-muted-foreground">Aucune description pour le moment.</p>
          )}
        </section>

        <CardImages boardId={card.board_id} cardId={card.id} images={images} readOnly={readOnly} />

        <section className="space-y-3 border-t pt-4" aria-labelledby="card-checklist-heading">
          <div className="flex items-center justify-between gap-2">
            <h3 id="card-checklist-heading" className="font-heading text-xl">
              Checklist
            </h3>
            <span
              className={
                progress.complete
                  ? "text-sm text-emerald-700 dark:text-emerald-400"
                  : "text-sm text-muted-foreground"
              }
            >
              {progress.done}/{progress.total}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progression de la checklist"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full rounded-full transition-all ${progress.complete ? "bg-emerald-600" : "bg-primary"}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <ul className="space-y-2">
            {[...checklist]
              .sort((a, b) => a.position - b.position)
              .map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.done}
                      disabled={readOnly || pending}
                      className="size-4 accent-primary"
                      onChange={(event) => {
                        const done = event.target.checked;
                        void run(() => setChecklistItemDone(card.board_id, card.id, item.id, done));
                      }}
                    />
                    <span
                      className={`break-words ${item.done ? "text-muted-foreground line-through" : ""}`}
                    >
                      {item.text}
                    </span>
                  </label>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Supprimer ${item.text}`}
                      disabled={pending}
                      onClick={() =>
                        void run(() => deleteChecklistItem(card.board_id, card.id, item.id))
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))}
          </ul>
          {!readOnly && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(
                  () => addChecklistItem(card.board_id, card.id, newItem),
                  () => setNewItem(""),
                );
              }}
              className="flex gap-2"
            >
              <Input
                aria-label="Nouvel élément de checklist"
                placeholder="Ajouter un élément…"
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                maxLength={CHECKLIST_TEXT_MAX}
                disabled={pending || checklist.length >= MAX_CHECKLIST_ITEMS}
              />
              <Button
                type="submit"
                aria-label="Ajouter à la checklist"
                disabled={pending || !newItem.trim() || checklist.length >= MAX_CHECKLIST_ITEMS}
              >
                <Plus aria-hidden="true" />
                Ajouter
              </Button>
            </form>
          )}
          {!readOnly && checklist.length >= MAX_CHECKLIST_ITEMS && (
            <p className="text-xs text-muted-foreground">30 éléments au maximum.</p>
          )}
        </section>

        <section className="space-y-3 border-t pt-4" aria-labelledby="card-comments-heading">
          <h3 id="card-comments-heading" className="font-heading text-xl">
            Commentaires
          </h3>
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun commentaire pour le moment.</p>
          )}
          <ol className="space-y-3">
            {[...comments]
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((item) => (
                <li key={item.id} className="rounded-lg border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{item.author_name || "Compte supprimé"}</p>
                      <time dateTime={item.created_at} className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Europe/Paris",
                        }).format(new Date(item.created_at))}
                      </time>
                    </div>
                    {(isOwner || item.author_profile_id === userId) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Supprimer le commentaire"
                        disabled={pending}
                        onClick={() =>
                          void run(() => deleteComment(card.board_id, card.id, item.id))
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{item.body}</p>
                </li>
              ))}
          </ol>
          {(
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(
                  () => addComment(card.board_id, card.id, comment),
                  () => setComment(""),
                );
              }}
              className="space-y-2"
            >
              <label htmlFor="card-comment" className="text-sm font-medium">
                Ajouter un commentaire
              </label>
              <Textarea
                id="card-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={COMMENT_MAX}
                disabled={pending}
                placeholder="Écris ton commentaire…"
              />
              <Button type="submit" disabled={pending || !comment.trim()}>
                Publier le commentaire
              </Button>
            </form>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
