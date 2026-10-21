import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { loadKanbanContent, loadOwnedBoards, loadPublicBoard } from "./data";

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

  it("exige un profil en ligne avant même de chercher le tableau public", async () => {
    const profile = query({ data: null, error: null });
    const from = vi.fn().mockReturnValue(profile);
    mocks.createClient.mockResolvedValue({ from });

    expect(await loadPublicBoard("profil-hors-ligne", "projet")).toBeNull();
    expect(profile.eq).toHaveBeenCalledWith("is_online", true);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("restreint la lecture publique au propriétaire, au slug et aux tableaux publics", async () => {
    const profile = query({ data: { id: "owner", username: "remy" }, error: null });
    const board = query({ data: null, error: null });
    const from = vi.fn().mockReturnValueOnce(profile).mockReturnValueOnce(board);
    mocks.createClient.mockResolvedValue({ from });

    expect(await loadPublicBoard("remy", "prive")).toBeNull();
    expect(board.eq).toHaveBeenCalledWith("owner_id", "owner");
    expect(board.eq).toHaveBeenCalledWith("slug", "prive");
    expect(board.eq).toHaveBeenCalledWith("is_public", true);
  });

  it("ne masque pas une panne de lecture par un état vide ou une page introuvable", async () => {
    const failure = query({ data: null, error: { message: "Connexion interrompue" } });
    mocks.createClient.mockResolvedValue({ from: vi.fn().mockReturnValue(failure) });
    await expect(loadPublicBoard("remy", "projet")).rejects.toThrow("Lecture du profil impossible");

    const supabase = await mocks.createClient();
    await expect(loadOwnedBoards(supabase, "owner")).rejects.toThrow(
      "Lecture des tableaux impossible",
    );
  });

  it("pagine les tableaux sans perdre ceux au-delà de la première réponse", async () => {
    const boards = query({ data: [{ id: "dernier" }], error: null });
    boards.range.mockResolvedValueOnce({
      data: Array.from({ length: 500 }, (_, id) => ({ id: String(id) })),
      error: null,
    });
    mocks.createClient.mockResolvedValue({ from: vi.fn().mockReturnValue(boards) });

    const result = await loadOwnedBoards(await mocks.createClient(), "owner");
    expect(result).toHaveLength(501);
    expect(boards.eq).toHaveBeenCalledWith("owner_id", "owner");
    expect(boards.range).toHaveBeenLastCalledWith(500, 999);
  });

  it("renvoie un espace vide sans requête aux tables des autres utilisateurs", async () => {
    const from = vi.fn();
    mocks.createClient.mockResolvedValue({ from });
    expect(await loadKanbanContent(await mocks.createClient(), [])).toEqual({
      lists: [],
      cards: [],
      checklist: [],
      comments: [],
    });
    expect(from).not.toHaveBeenCalled();
  });
});
