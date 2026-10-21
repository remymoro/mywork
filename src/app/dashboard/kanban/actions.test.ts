import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  addChecklistItem,
  addComment,
  createBoard,
  createCard,
  createList,
  deleteComment,
  moveCard,
  updateBoard,
} from "./actions";

type Reply = { data: unknown; error: { message: string; code?: string } | null };
const replies: Reply[] = [];

function query(table: string) {
  return {
    table,
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then(resolve: (reply: Reply) => unknown) {
      return Promise.resolve(replies.shift() ?? { data: null, error: null }).then(resolve);
    },
  };
}

const queries: ReturnType<typeof query>[] = [];
const ok = (data: unknown): Reply => ({ data, error: null });
const board = { id: "board-1", slug: "projet" };

beforeEach(() => {
  vi.clearAllMocks();
  replies.length = 0;
  queries.length = 0;
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });
  mocks.redirect.mockImplementation(() => {
    throw new Error("REDIRECT");
  });
  mocks.from.mockImplementation((table: string) => {
    const result = query(table);
    queries.push(result);
    return result;
  });
  mocks.rpc.mockResolvedValue({ error: null });
});

describe("actions Kanban : session, validation et propriété", () => {
  it("vérifie la session avant même la validation et refuse le visiteur", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(createBoard({ name: "", icon: "document", is_public: false })).rejects.toThrow(
      "REDIRECT",
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("ne touche pas la base si un titre est vide", async () => {
    const result = await createCard("board-1", "list-1", "   ");
    expect(result.error).toContain("obligatoire");
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("filtre les modifications de tableau sur le propriétaire sans changer l'URL", async () => {
    replies.push(ok({ id: "board-1" }));
    expect(await updateBoard("board-1", { name: " Nouveau nom " })).toEqual({
      saved: true,
      id: "board-1",
    });
    expect(queries[0].update).toHaveBeenCalledWith({ name: "Nouveau nom" });
    expect(queries[0].eq).toHaveBeenCalledWith("id", "board-1");
    expect(queries[0].eq).toHaveBeenCalledWith("owner_id", "owner-1");
  });

  it("n'écrit aucun commentaire si le tableau appartient à quelqu'un d'autre", async () => {
    replies.push(ok(null));
    expect((await addComment("board-1", "card-1", "Bonjour")).error).toContain("accès refusé");
    expect(queries).toHaveLength(1);
    expect(queries[0].eq).toHaveBeenCalledWith("owner_id", "owner-1");
    expect(queries[0].insert).not.toHaveBeenCalled();
  });

  it("refuse une carte qui n'appartient pas au tableau autorisé", async () => {
    replies.push(ok(board), ok(null));
    expect((await addChecklistItem("board-1", "foreign-card", "À faire")).error).toContain(
      "accès refusé",
    );
    expect(queries[1].eq).toHaveBeenCalledWith("board_id", "board-1");
    expect(queries).toHaveLength(2);
  });

  it("attribue le commentaire à la session et limite sa suppression à la carte autorisée", async () => {
    replies.push(ok(board), ok({ id: "card-1" }), ok({ id: "comment-1" }));
    expect(await addComment("board-1", "card-1", " Bonjour ")).toMatchObject({ saved: true });
    expect(queries[2].insert).toHaveBeenCalledWith({
      card_id: "card-1",
      author_profile_id: "owner-1",
      body: "Bonjour",
    });
    replies.push(ok(board), ok({ id: "card-1" }), ok(null));
    expect((await deleteComment("board-1", "card-1", "foreign-comment")).error).toBeTruthy();
    expect(queries[5].eq).toHaveBeenCalledWith("card_id", "card-1");
  });
});

describe("actions Kanban : créations concurrentes et limites", () => {
  it("choisit un slug libre et retente après une collision concurrente", async () => {
    replies.push(
      ok({ position: 0 }),
      ok([{ slug: "ete" }]),
      { data: null, error: { code: "23505", message: "duplicate key" } },
      ok({ id: "new-board", slug: "ete-3" }),
    );
    expect(await createBoard({ name: "Été", icon: "document", is_public: false })).toEqual({
      saved: true,
      id: "new-board",
      slug: "ete-3",
    });
    expect(queries[2].insert).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "ete-2", owner_id: "owner-1" }),
    );
    expect(queries[3].insert).toHaveBeenCalledWith(expect.objectContaining({ slug: "ete-3" }));
  });

  it("cherche les noms au-delà de la première page de tableaux", async () => {
    replies.push(
      ok({ position: 500000 }),
      ok(Array.from({ length: 500 }, (_, index) => ({ slug: index ? `ete-${index + 1}` : "ete" }))),
      ok([{ slug: "ete-501" }]),
      ok({ id: "new-board", slug: "ete-502" }),
    );
    expect(await createBoard({ name: "Été", icon: "document", is_public: false })).toEqual({
      saved: true,
      id: "new-board",
      slug: "ete-502",
    });
    expect(queries[2].range).toHaveBeenCalledWith(500, 999);
    expect(queries[3].insert).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "ete-502", position: 501000 }),
    );
  });

  it("remonte le refus de la sixième liste sans annoncer de réussite", async () => {
    replies.push(ok(board), { data: null, error: { message: "5 listes au maximum" } });
    expect(await createList("board-1", { title: "À faire", color: "rose" })).toEqual({
      error: "5 listes au maximum",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("vérifie la liste de l'ajout rapide et remonte la limite de vingt cartes", async () => {
    replies.push(ok(board), ok({ id: "list-1" }), {
      data: null,
      error: { message: "Cette liste est pleine : 20 cartes au maximum" },
    });
    expect(await createCard("board-1", "list-1", "Nouvelle carte")).toEqual({
      error: "Cette liste est pleine : 20 cartes au maximum",
    });
    expect(queries[1].eq).toHaveBeenCalledWith("board_id", "board-1");
  });

  it("déplace par une seule fonction SQL et conserve le message d'une liste pleine", async () => {
    replies.push(ok(board), ok({ id: "card-1" }));
    mocks.rpc.mockResolvedValue({
      error: { message: "Cette liste est pleine : 20 cartes au maximum" },
    });
    expect(await moveCard("board-1", "card-1", "list-2", 4)).toEqual({
      error: "Cette liste est pleine : 20 cartes au maximum",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("kanban_move_card", {
      card_id: "card-1",
      target_list_id: "list-2",
      target_index: 4,
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("masque les erreurs techniques et n'annonce pas une écriture réussie", async () => {
    replies.push(ok(board), { data: null, error: { message: "internal postgres detail" } });
    const result = await createList("board-1", { title: "À faire", color: "rose" });
    expect(result.error).toBe("Impossible d'enregistrer. Réessaie.");
    expect(result.saved).toBeUndefined();
  });
});
