import { createClient } from "@/lib/supabase/server";
import type {
  ChecklistItem,
  KanbanBoard,
  KanbanCard,
  KanbanCardImage,
  KanbanComment,
  KanbanList,
  KanbanPerson,
} from "@/lib/kanban";
import { personName } from "@/lib/kanban";

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

/** Tableaux créés par l'utilisateur puis ceux partagés avec lui (la RLS ne renvoie que ceux-là). */
export async function loadAccessibleBoards(supabase: Supabase, userId: string) {
  const boards = await readRows<KanbanBoard>(
    (start, end) =>
      supabase
        .from("kanban_boards")
        .select("*")
        .order("position")
        .order("created_at")
        .order("id")
        .range(start, end),
    "des tableaux",
  );
  return [
    ...boards.filter((board) => board.owner_id === userId),
    ...boards.filter((board) => board.owner_id !== userId),
  ];
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

  // Noms du propriétaire et des membres, lus même si leur profil est hors ligne.
  const people: KanbanPerson[] = [];
  for (const board of boards) {
    const { data, error } = await supabase.rpc("kanban_board_people", { board: board.id });
    if (error) throw new Error(`Lecture des membres impossible : ${error.message}`);
    for (const person of (data ?? []) as Omit<KanbanPerson, "board_id">[]) {
      people.push({ ...person, board_id: board.id });
    }
  }
  const names = new Map(people.map((person) => [person.id, personName(person)]));

  return {
    lists,
    cards,
    checklist,
    images: await signImages(supabase, images),
    people,
    comments: comments.map((comment) => ({
      ...comment,
      author_name: names.get(comment.author_profile_id ?? "") ?? "Ancien membre",
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
