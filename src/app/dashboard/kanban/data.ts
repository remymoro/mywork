import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  ChecklistItem,
  KanbanBoard,
  KanbanCard,
  KanbanCardImage,
  KanbanComment,
  KanbanList,
} from "@/lib/kanban";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Supabase borne les réponses : paginer évite de tronquer les tableaux d'un compte.
async function readRows<T>(
  load: (
    start: number,
    end: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
  label: string,
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 500;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await load(start, start + pageSize - 1);
    if (error) throw new Error(`Lecture ${label} impossible : ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) return rows;
  }
}

export async function loadOwnedBoards(supabase: Supabase, ownerId: string) {
  return readRows<KanbanBoard>(
    (start, end) =>
      supabase
        .from("kanban_boards")
        .select("*")
        .eq("owner_id", ownerId)
        .order("position")
        .order("id")
        .range(start, end),
    "des tableaux",
  );
}

export async function loadKanbanContent(supabase: Supabase, boards: KanbanBoard[]) {
  const lists: KanbanList[] = [];
  const cards: KanbanCard[] = [];
  const checklist: ChecklistItem[] = [];
  const comments: KanbanComment[] = [];
  const images: KanbanCardImage[] = [];

  // Petits lots pour ne pas dépasser la taille d'une URL de l'API.
  for (let offset = 0; offset < boards.length; offset += 20) {
    const boardIds = boards.slice(offset, offset + 20).map((board) => board.id);
    const [boardLists, boardCards] = await Promise.all([
      readRows<KanbanList>(
        (start, end) =>
          supabase
            .from("kanban_lists")
            .select("*")
            .in("board_id", boardIds)
            .order("position")
            .order("id")
            .range(start, end),
        "des listes",
      ),
      readRows<KanbanCard>(
        (start, end) =>
          supabase
            .from("kanban_cards")
            .select("*")
            .in("board_id", boardIds)
            .order("position")
            .order("id")
            .range(start, end),
        "des cartes",
      ),
    ]);
    lists.push(...boardLists);
    cards.push(...boardCards);
  }

  for (let offset = 0; offset < cards.length; offset += 100) {
    const cardIds = cards.slice(offset, offset + 100).map((card) => card.id);
    const [cardChecklist, cardComments, cardImages] = await Promise.all([
      readRows<ChecklistItem>(
        (start, end) =>
          supabase
            .from("kanban_checklist_items")
            .select("*")
            .in("card_id", cardIds)
            .order("position")
            .order("id")
            .range(start, end),
        "de la checklist",
      ),
      readRows<KanbanComment>(
        (start, end) =>
          supabase
            .from("kanban_comments")
            .select("*")
            .in("card_id", cardIds)
            .order("created_at")
            .order("id")
            .range(start, end),
        "des commentaires",
      ),
      readRows<KanbanCardImage>(
        (start, end) =>
          supabase
            .from("kanban_card_images")
            .select("*")
            .in("card_id", cardIds)
            .order("position")
            .order("id")
            .range(start, end),
        "des images",
      ),
    ]);
    checklist.push(...cardChecklist);
    comments.push(...cardComments);
    images.push(...cardImages);
  }

  const authorIds = [
    ...new Set(
      comments.flatMap((comment) => (comment.author_profile_id ? [comment.author_profile_id] : [])),
    ),
  ];
  const names = new Map<string, string>();
  for (let offset = 0; offset < authorIds.length; offset += 100) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", authorIds.slice(offset, offset + 100));
    if (error) throw new Error(`Lecture des auteurs impossible : ${error.message}`);
    for (const author of data ?? []) names.set(author.id, author.display_name || author.username);
  }

  return {
    lists,
    cards,
    checklist,
    images: await signImages(supabase, images),
    comments: comments.map((comment) => ({
      ...comment,
      author_name: names.get(comment.author_profile_id ?? "") ?? "Compte supprimé",
    })),
  };
}

// Dossier privé : chaque image reçoit une adresse signée valable une heure. Le stockage ne signe
// que les images que l'appelant a le droit de voir (règles de la migration 20261021200000).
async function signImages(supabase: Supabase, images: KanbanCardImage[]) {
  if (images.length === 0) return images;
  const { data } = await supabase.storage
    .from("kanban-images")
    .createSignedUrls(
      images.map((image) => image.path),
      60 * 60,
    );
  const urls = new Map((data ?? []).map((item) => [item.path, item.signedUrl]));
  return images.map((image) => ({ ...image, url: urls.get(image.path) ?? undefined }));
}

// Partagé par la page et ses métadonnées, uniquement pendant la requête courante.
export const loadPublicBoard = cache(async (username: string, slug: string) => {
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .eq("is_online", true)
    .maybeSingle();
  if (profileError) throw new Error(`Lecture du profil impossible : ${profileError.message}`);
  if (!profile) return null;

  const { data: board, error } = await supabase
    .from("kanban_boards")
    .select("*")
    .eq("owner_id", profile.id)
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (error) throw new Error(`Lecture du tableau impossible : ${error.message}`);
  if (!board) return null;
  return { profile, board: board as KanbanBoard };
});
