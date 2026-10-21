import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { loadAccessibleBoards, loadKanbanContent } from "./data";

function query(result: { data: unknown; error: { message: string } | null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

describe("Lecture des tableaux Kanban", () => {
  beforeEach(() => vi.clearAllMocks());

  it("liste d'abord ses tableaux, puis ceux partagés avec soi", async () => {
    const boards = query({
      data: [
        { id: "partage", owner_id: "autre" },
        { id: "mien", owner_id: "moi" },
      ],
      error: null,
    });
    const result = await loadAccessibleBoards(
      { from: vi.fn().mockReturnValue(boards) } as never,
      "moi",
    );
    expect(result.map((board) => board.id)).toEqual(["mien", "partage"]);
    // Pas de filtre sur le propriétaire : la RLS renvoie ses tableaux et ceux partagés avec soi.
    expect(boards.eq).not.toHaveBeenCalled();
  });

  it("ne masque pas une panne de lecture par un état vide", async () => {
    const failure = query({ data: null, error: { message: "Connexion interrompue" } });
    await expect(
      loadAccessibleBoards({ from: vi.fn().mockReturnValue(failure) } as never, "moi"),
    ).rejects.toThrow("Lecture des tableaux impossible");
  });

  it("pagine les tableaux sans perdre ceux au-delà de la première réponse", async () => {
    const boards = query({ data: [{ id: "dernier", owner_id: "moi" }], error: null });
    boards.range.mockResolvedValueOnce({
      data: Array.from({ length: 500 }, (_, id) => ({ id: String(id), owner_id: "moi" })),
      error: null,
    });
    const result = await loadAccessibleBoards(
      { from: vi.fn().mockReturnValue(boards) } as never,
      "moi",
    );
    expect(result).toHaveLength(501);
    expect(boards.range).toHaveBeenLastCalledWith(500, 999);
  });

  it("renvoie un espace vide sans requête quand il n'y a aucun tableau", async () => {
    const from = vi.fn();
    const rpc = vi.fn();
    expect(await loadKanbanContent({ from, rpc } as never, [])).toEqual({
      lists: [],
      cards: [],
      checklist: [],
      comments: [],
      images: [],
      people: [],
    });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
