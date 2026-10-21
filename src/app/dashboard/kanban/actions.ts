"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  slugify,
  validateBoardName,
  validateBoardIcon,
  validateListTitle,
  validateListColor,
  validateCardTitle,
  validateDescription,
  validateChecklistText,
  validateComment,
  validateCardImage,
  MAX_CARD_IMAGES,
} from "@/lib/kanban";

const IMAGES_BUCKET = "kanban-images";

export type KanbanActionResult = { error?: string; saved?: boolean; id?: string; slug?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Session = { supabase: Supabase; userId: string };
type DatabaseError = { message: string; code?: string } | null;

async function currentUser(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

/** La RLS protège aussi la base ; ce filtre explicite ferme l'accès dès l'action serveur. */
async function ownedBoard({ supabase, userId }: Session, boardId: string) {
  const { data, error } = await supabase
    .from("kanban_boards")
    .select("id, slug")
    .eq("id", boardId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) return { error: "Impossible de lire ce tableau. Réessaie." };
  if (!data) return { error: "Tableau introuvable ou accès refusé." };
  return { board: data };
}

async function ownedCard(session: Session, boardId: string, cardId: string) {
  const access = await ownedBoard(session, boardId);
  if (access.error) return access.error;
  const { data, error } = await session.supabase
    .from("kanban_cards")
    .select("id")
    .eq("id", cardId)
    .eq("board_id", boardId)
    .maybeSingle();
  if (error) return "Impossible de lire cette carte. Réessaie.";
  return data ? null : "Carte introuvable ou accès refusé.";
}

function databaseMessage(error: DatabaseError, fallback = "Impossible d'enregistrer. Réessaie.") {
  // Ne pas exposer les détails internes de Postgres au navigateur.
  const limits = [
    "Cette liste est pleine : 20 cartes au maximum",
    "5 listes au maximum",
    "30 éléments de checklist au maximum",
  ];
  return limits.find((message) => error?.message.includes(message)) ?? fallback;
}

/** Chemins des images à effacer du stockage quand on supprime une carte, une liste ou un tableau. */
async function imagePaths(
  supabase: Supabase,
  filter: { boardId: string; cardIds?: string[] },
): Promise<string[]> {
  let query = supabase.from("kanban_card_images").select("path").eq("board_id", filter.boardId);
  if (filter.cardIds) {
    if (filter.cardIds.length === 0) return [];
    query = query.in("card_id", filter.cardIds);
  }
  const { data } = await query;
  return (data ?? []).map((row) => row.path as string);
}

// La base a déjà supprimé les lignes (cascade) : on retire les fichiers, sans bloquer si ça échoue.
async function removeImageFiles(supabase: Supabase, paths: string[]) {
  if (paths.length) await supabase.storage.from(IMAGES_BUCKET).remove(paths);
}

function refresh() {
  revalidatePath("/dashboard/kanban");
  revalidatePath("/[username]/kanban/[slug]", "page");
}

function saved(id?: string): KanbanActionResult {
  refresh();
  return { saved: true, ...(id ? { id } : {}) };
}

/** Une URL existante reste stable quand on renomme le tableau. */
export async function createBoard(input: {
  name: string;
  icon: string;
  is_public: boolean;
}): Promise<KanbanActionResult> {
  const { supabase, userId } = await currentUser();
  const name = validateBoardName(input?.name);
  if (!name.ok) return { error: name.error };
  const icon = validateBoardIcon(input.icon);
  if (!icon.ok) return { error: icon.error };
  if (typeof input.is_public !== "boolean") return { error: "Choisis un tableau public ou privé." };

  const base = slugify(name.value) || "tableau";
  const { data: last, error: readError } = await supabase
    .from("kanban_boards")
    .select("position")
    .eq("owner_id", userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) return { error: "Impossible de lire tes tableaux. Réessaie." };
  const position = (last?.position ?? -1000) + 1000;
  const used = new Set<string>();
  // Pas de limite au nombre de tableaux : l'API pagine, même au-delà de 1 000 noms identiques.
  for (let offset = 0; ; offset += 500) {
    const { data: page, error } = await supabase
      .from("kanban_boards")
      .select("slug")
      .eq("owner_id", userId)
      .like("slug", `${base}%`)
      .order("slug")
      .range(offset, offset + 499);
    if (error) return { error: "Impossible de lire tes tableaux. Réessaie." };
    for (const board of page ?? []) used.add(board.slug);
    if (!page || page.length < 500) break;
  }
  let suffix = 1;

  // La contrainte unique tranche aussi deux créations simultanées ; on retente un autre suffixe.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let slug = suffix === 1 ? base : `${base}-${suffix}`;
    while (used.has(slug)) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    const { data, error } = await supabase
      .from("kanban_boards")
      .insert({
        owner_id: userId,
        name: name.value,
        slug,
        icon: icon.value,
        is_public: input.is_public,
        position,
      })
      .select("id, slug")
      .single();
    if (!error && data) return { ...saved(data.id), slug: data.slug };
    if (error?.code !== "23505") return { error: databaseMessage(error) };
    used.add(slug);
  }
  return { error: "Un tableau du même nom vient d'être créé. Réessaie." };
}

export async function updateBoard(
  boardId: string,
  input: { name?: string; icon?: string; is_public?: boolean },
): Promise<KanbanActionResult> {
  const session = await currentUser();
  const values: { name?: string; icon?: string; is_public?: boolean } = {};
  if (input?.name !== undefined) {
    const name = validateBoardName(input.name);
    if (!name.ok) return { error: name.error };
    values.name = name.value;
  }
  if (input?.icon !== undefined) {
    const icon = validateBoardIcon(input.icon);
    if (!icon.ok) return { error: icon.error };
    values.icon = icon.value;
  }
  if (input?.is_public !== undefined) {
    if (typeof input.is_public !== "boolean")
      return { error: "Choisis un tableau public ou privé." };
    values.is_public = input.is_public;
  }
  if (!Object.keys(values).length) return { error: "Aucune modification à enregistrer." };
  const { data, error } = await session.supabase
    .from("kanban_boards")
    .update(values)
    .eq("id", boardId)
    .eq("owner_id", session.userId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: databaseMessage(error) };
  return saved(data.id);
}

export async function deleteBoard(boardId: string): Promise<KanbanActionResult> {
  const { supabase, userId } = await currentUser();
  const paths = await imagePaths(supabase, { boardId });
  const { data, error } = await supabase
    .from("kanban_boards")
    .delete()
    .eq("id", boardId)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Impossible de supprimer ce tableau. Réessaie." };
  await removeImageFiles(supabase, paths);
  return saved();
}

export async function createList(
  boardId: string,
  input: { title: string; color: string },
): Promise<KanbanActionResult> {
  const session = await currentUser();
  const title = validateListTitle(input?.title);
  if (!title.ok) return { error: title.error };
  const color = validateListColor(input.color);
  if (!color.ok) return { error: color.error };
  const access = await ownedBoard(session, boardId);
  if (access.error) return { error: access.error };
  const { data, error } = await session.supabase
    .from("kanban_lists")
    .insert({ board_id: boardId, title: title.value, color: color.value })
    .select("id")
    .single();
  if (error || !data) return { error: databaseMessage(error) };
  return saved(data.id);
}

export async function updateList(
  boardId: string,
  listId: string,
  input: { title?: string; color?: string },
): Promise<KanbanActionResult> {
  const session = await currentUser();
  const values: { title?: string; color?: string } = {};
  if (input?.title !== undefined) {
    const title = validateListTitle(input.title);
    if (!title.ok) return { error: title.error };
    values.title = title.value;
  }
  if (input?.color !== undefined) {
    const color = validateListColor(input.color);
    if (!color.ok) return { error: color.error };
    values.color = color.value;
  }
  if (!Object.keys(values).length) return { error: "Aucune modification à enregistrer." };
  const access = await ownedBoard(session, boardId);
  if (access.error) return { error: access.error };
  const { data, error } = await session.supabase
    .from("kanban_lists")
    .update(values)
    .eq("id", listId)
    .eq("board_id", boardId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: databaseMessage(error) };
  return saved(data.id);
}

/** Une seule liste de fin par tableau : en choisir une retire ce rôle à l'ancienne. */
export async function setDoneList(
  boardId: string,
  listId: string,
  isDone: boolean,
): Promise<KanbanActionResult> {
  const session = await currentUser();
  const access = await ownedBoard(session, boardId);
  if (access.error) return { error: access.error };
  if (isDone) {
    const { error } = await session.supabase
      .from("kanban_lists")
      .update({ is_done_list: false })
      .eq("board_id", boardId)
      .eq("is_done_list", true)
      .neq("id", listId);
    if (error) return { error: databaseMessage(error) };
  }
  const { data, error } = await session.supabase
    .from("kanban_lists")
    .update({ is_done_list: isDone })
    .eq("id", listId)
    .eq("board_id", boardId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: databaseMessage(error) };
  return saved(data.id);
}

export async function deleteList(boardId: string, listId: string): Promise<KanbanActionResult> {
  const session = await currentUser();
  const access = await ownedBoard(session, boardId);
  if (access.error) return { error: access.error };
  const { data: listCards } = await session.supabase
    .from("kanban_cards")
    .select("id")
    .eq("list_id", listId)
    .eq("board_id", boardId);
  const paths = await imagePaths(session.supabase, {
    boardId,
    cardIds: (listCards ?? []).map((card) => card.id as string),
  });
  const { data, error } = await session.supabase
    .from("kanban_lists")
    .delete()
    .eq("id", listId)
    .eq("board_id", boardId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Impossible de supprimer cette liste. Réessaie." };
  await removeImageFiles(session.supabase, paths);
  return saved();
}

export async function createCard(
  boardId: string,
  listId: string,
  rawTitle: string,
): Promise<KanbanActionResult> {
  const session = await currentUser();
  const title = validateCardTitle(rawTitle);
  if (!title.ok) return { error: title.error };
  const access = await ownedBoard(session, boardId);
  if (access.error) return { error: access.error };
  const { data: list, error: listError } = await session.supabase
    .from("kanban_lists")
    .select("id")
    .eq("id", listId)
    .eq("board_id", boardId)
    .maybeSingle();
  if (listError || !list) return { error: "Liste introuvable ou accès refusé." };
  const { data, error } = await session.supabase
    .from("kanban_cards")
    .insert({
      board_id: boardId,
      list_id: listId,
      title: title.value,
      author_profile_id: session.userId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: databaseMessage(error) };
  return saved(data.id);
}

export async function updateCard(
  boardId: string,
  cardId: string,
  input: { title: string; description: string },
): Promise<KanbanActionResult> {
  const session = await currentUser();
  const title = validateCardTitle(input?.title);
  if (!title.ok) return { error: title.error };
  const description = validateDescription(input?.description);
  if (!description.ok) return { error: description.error };
  const access = await ownedBoard(session, boardId);
  if (access.error) return { error: access.error };
  const { data, error } = await session.supabase
    .from("kanban_cards")
    .update({ title: title.value, description: description.value })
    .eq("id", cardId)
    .eq("board_id", boardId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: databaseMessage(error) };
  return saved(data.id);
}

export async function deleteCard(boardId: string, cardId: string): Promise<KanbanActionResult> {
  const session = await currentUser();
  const access = await ownedBoard(session, boardId);
  if (access.error) return { error: access.error };
  const paths = await imagePaths(session.supabase, { boardId, cardIds: [cardId] });
  const { data, error } = await session.supabase
    .from("kanban_cards")
    .delete()
    .eq("id", cardId)
    .eq("board_id", boardId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Impossible de supprimer cette carte. Réessaie." };
  await removeImageFiles(session.supabase, paths);
  return saved();
}

export async function moveCard(
  boardId: string,
  cardId: string,
  targetListId: string,
  targetIndex: number,
): Promise<KanbanActionResult> {
  const session = await currentUser();
  if (!Number.isSafeInteger(targetIndex) || targetIndex < 0) return { error: "Position invalide." };
  const accessError = await ownedCard(session, boardId, cardId);
  if (accessError) return { error: accessError };
  const { error } = await session.supabase.rpc("kanban_move_card", {
    card_id: cardId,
    target_list_id: targetListId,
    target_index: targetIndex,
  });
  if (error)
    return { error: databaseMessage(error, "Impossible de déplacer cette carte. Réessaie.") };
  return saved();
}

export async function moveList(
  boardId: string,
  listId: string,
  targetIndex: number,
): Promise<KanbanActionResult> {
  const session = await currentUser();
  if (!Number.isSafeInteger(targetIndex) || targetIndex < 0) return { error: "Position invalide." };
  const access = await ownedBoard(session, boardId);
  if (access.error) return { error: access.error };
  const { data, error: readError } = await session.supabase
    .from("kanban_lists")
    .select("id")
    .eq("id", listId)
    .eq("board_id", boardId)
    .maybeSingle();
  if (readError || !data) return { error: "Liste introuvable ou accès refusé." };
  const { error } = await session.supabase.rpc("kanban_move_list", {
    list_id: listId,
    target_index: targetIndex,
  });
  if (error)
    return { error: databaseMessage(error, "Impossible de déplacer cette liste. Réessaie.") };
  return saved();
}

export async function addChecklistItem(
  boardId: string,
  cardId: string,
  rawText: string,
): Promise<KanbanActionResult> {
  const session = await currentUser();
  const text = validateChecklistText(rawText);
  if (!text.ok) return { error: text.error };
  const accessError = await ownedCard(session, boardId, cardId);
  if (accessError) return { error: accessError };
  const { data, error } = await session.supabase
    .from("kanban_checklist_items")
    .insert({ card_id: cardId, text: text.value })
    .select("id")
    .single();
  if (error || !data) return { error: databaseMessage(error) };
  return saved(data.id);
}

export async function setChecklistItemDone(
  boardId: string,
  cardId: string,
  itemId: string,
  done: boolean,
): Promise<KanbanActionResult> {
  const session = await currentUser();
  if (typeof done !== "boolean") return { error: "État de checklist invalide." };
  const accessError = await ownedCard(session, boardId, cardId);
  if (accessError) return { error: accessError };
  const { data, error } = await session.supabase
    .from("kanban_checklist_items")
    .update({ done })
    .eq("id", itemId)
    .eq("card_id", cardId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: databaseMessage(error) };
  return saved(data.id);
}

export async function deleteChecklistItem(
  boardId: string,
  cardId: string,
  itemId: string,
): Promise<KanbanActionResult> {
  const session = await currentUser();
  const accessError = await ownedCard(session, boardId, cardId);
  if (accessError) return { error: accessError };
  const { data, error } = await session.supabase
    .from("kanban_checklist_items")
    .delete()
    .eq("id", itemId)
    .eq("card_id", cardId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Impossible de supprimer cet élément. Réessaie." };
  return saved();
}

export async function addComment(
  boardId: string,
  cardId: string,
  rawBody: string,
): Promise<KanbanActionResult> {
  const session = await currentUser();
  const body = validateComment(rawBody);
  if (!body.ok) return { error: body.error };
  const accessError = await ownedCard(session, boardId, cardId);
  if (accessError) return { error: accessError };
  const { data, error } = await session.supabase
    .from("kanban_comments")
    .insert({ card_id: cardId, author_profile_id: session.userId, body: body.value })
    .select("id")
    .single();
  if (error || !data) return { error: databaseMessage(error) };
  return saved(data.id);
}

export async function deleteComment(
  boardId: string,
  cardId: string,
  commentId: string,
): Promise<KanbanActionResult> {
  const session = await currentUser();
  const accessError = await ownedCard(session, boardId, cardId);
  if (accessError) return { error: accessError };
  const { data, error } = await session.supabase
    .from("kanban_comments")
    .delete()
    .eq("id", commentId)
    .eq("card_id", cardId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Impossible de supprimer ce commentaire. Réessaie." };
  return saved();
}

/** Une image par appel (2 Mo max) : la page enchaîne les envois quand on en dépose plusieurs. */
export async function uploadCardImage(
  boardId: string,
  cardId: string,
  formData: FormData,
): Promise<KanbanActionResult> {
  const session = await currentUser();
  const file = formData.get("image");
  if (!(file instanceof File)) return { error: "Choisis une image." };
  const checked = validateCardImage(file);
  if (!checked.ok) return { error: checked.error };
  const accessError = await ownedCard(session, boardId, cardId);
  if (accessError) return { error: accessError };

  const { count } = await session.supabase
    .from("kanban_card_images")
    .select("id", { count: "exact", head: true })
    .eq("card_id", cardId);
  if ((count ?? 0) >= MAX_CARD_IMAGES) return { error: "5 images au maximum par carte." };

  const path = `${session.userId}/${boardId}/${cardId}/${Date.now()}-${crypto.randomUUID()}.${checked.value}`;
  const { error: uploadError } = await session.supabase.storage
    .from(IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: "Impossible d'envoyer l'image. Réessaie." };

  const { data, error } = await session.supabase
    .from("kanban_card_images")
    .insert({ card_id: cardId, board_id: boardId, path })
    .select("id")
    .single();
  if (error || !data) {
    // Pas de fichier orphelin si la ligne est refusée (limite atteinte entre-temps).
    await removeImageFiles(session.supabase, [path]);
    return {
      error: error?.message.includes("5 images au maximum")
        ? "5 images au maximum par carte."
        : "Impossible d'enregistrer l'image. Réessaie.",
    };
  }
  return saved(data.id);
}

export async function deleteCardImage(
  boardId: string,
  cardId: string,
  imageId: string,
): Promise<KanbanActionResult> {
  const session = await currentUser();
  const accessError = await ownedCard(session, boardId, cardId);
  if (accessError) return { error: accessError };
  const { data, error } = await session.supabase
    .from("kanban_card_images")
    .delete()
    .eq("id", imageId)
    .eq("card_id", cardId)
    .eq("board_id", boardId)
    .select("path")
    .maybeSingle();
  if (error || !data) return { error: "Impossible de supprimer cette image. Réessaie." };
  await removeImageFiles(session.supabase, [data.path as string]);
  return saved();
}
