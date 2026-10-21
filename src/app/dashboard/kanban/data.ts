import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  ChecklistItem,
  KanbanBoard,
  KanbanCard,
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
    const [cardChecklist, cardComments] = await Promise.all([
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
    ]);
    checklist.push(...cardChecklist);
    comments.push(...cardComments);
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
    comments: comments.map((comment) => ({
      ...comment,
      author_name: names.get(comment.author_profile_id ?? "") ?? "Compte supprimé",
    })),
  };
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
