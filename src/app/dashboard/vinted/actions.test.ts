import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), revalidatePath: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { createItem, updateItem, advanceItem, backItem, cancelSale, deleteItem } from "./actions";

type Reply = { data: unknown; error: { message: string; code?: string } | null };
const replies: Reply[] = [];
const queries: ReturnType<typeof query>[] = [];
function query() {
  return {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(), single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then(resolve: (reply: Reply) => unknown) { return Promise.resolve(replies.shift() ?? { data: null, error: null }).then(resolve); },
  };
}
const ok = (data: unknown): Reply => ({ data, error: null });
const ID = "5b3f0c1e-1111-4222-8333-444455556666";
const NOW = "2026-10-23T12:00:00.000Z";
const UPDATED = "2026-10-22T12:00:00Z";
function row(patch: Record<string, unknown> = {}) {
  return {
    id: ID, owner_id: "user-1", title: "Robe", brand: null, size: null, condition: null,
    purchase_price_cents: null, listing_price_cents: null, sale_price_cents: null,
    buyer: null, carrier: null, tracking_number: null, notes: null, status: "a_publier",
    listed_at: null, sold_at: null, shipped_at: null, delivered_at: null, completed_at: null,
    created_at: UPDATED, updated_at: UPDATED, ...patch,
  };
}
function form(patch: Record<string, string | undefined> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ title: " Robe ", ...patch })) {
    if (value !== undefined) data.set(key, value);
  }
  return data;
}
const actions = [
  { name: "création", run: () => createItem(form()) },
  { name: "modification", run: () => updateItem(ID, form()) },
  { name: "avancement", run: () => advanceItem(ID) },
  { name: "retour", run: () => backItem(ID) },
  { name: "annulation", run: () => cancelSale(ID) },
  { name: "suppression", run: () => deleteItem(ID) },
];
const existingActions = [
  { name: "modification", run: (id: string) => updateItem(id, form()) },
  { name: "avancement", run: advanceItem }, { name: "retour", run: backItem },
  { name: "annulation", run: cancelSale }, { name: "suppression", run: deleteItem },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  replies.length = 0;
  queries.length = 0;
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
  mocks.from.mockImplementation(() => { const q = query(); queries.push(q); return q; });
});
afterEach(() => vi.useRealTimers());

describe("session, identifiant et propriétaire", () => {
  it.each(actions)("demande une connexion pour $name", async ({ run }) => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(run()).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each(existingActions)("refuse un UUID mal formé pour $name", async ({ run }) => {
    expect(await run("invalide")).toEqual({ error: "Article introuvable." });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each(existingActions)("refuse un article absent ou appartenant à un autre utilisateur pour $name", async ({ run }) => {
    replies.push(ok(null));
    expect(await run(ID)).toEqual({ error: "Article introuvable." });
    expect(queries).toHaveLength(1);
    expect(queries[0].eq).toHaveBeenCalledWith("id", ID);
    expect(queries[0].eq).toHaveBeenCalledWith("owner_id", "user-1");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each(existingActions)("ne révèle aucune erreur SQL pour $name", async ({ run }) => {
    replies.push({ data: null, error: { message: "permission denied on public.vinted_items", code: "42501" } });
    const result = await run(ID);
    expect(result.error).toMatch(/Impossible/);
    expect(result.error).not.toMatch(/permission|public|vinted_items|42501/);
    expect(queries).toHaveLength(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("création et modification", () => {
  it("crée au nom de la session, à la première étape, sans dates fournies par le navigateur", async () => {
    replies.push(ok({ id: ID }));
    expect(await createItem(form({ purchasePrice: "0", listingPrice: "12,50", owner_id: "autre", status: "termine", sold_at: NOW })))
      .toEqual({ saved: true, id: ID });
    expect(queries[0].insert).toHaveBeenCalledWith({
      owner_id: "user-1", title: "Robe", brand: null, size: null, condition: null,
      purchase_price_cents: 0, listing_price_cents: 1250, sale_price_cents: null,
      buyer: null, carrier: null, tracking_number: null, notes: null, status: "a_publier",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledExactlyOnceWith("/dashboard/vinted");
  });

  it.each([{ title: " " }, { listingPrice: "-1" }, { carrier: "inconnu" }])("valide avant la création : %j", async (patch) => {
    expect((await createItem(form(patch))).error).toBeDefined();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("refuse les fichiers à la place du texte", async () => {
    const data = form();
    data.set("title", new File(["contenu"], "article.txt"));
    expect((await createItem(data)).error).toBeDefined();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("explique le plafond de 500 articles", async () => {
    replies.push({ data: null, error: { message: "500 articles au maximum", code: "23514" } });
    expect((await createItem(form())).error).toBe("500 articles au maximum : supprime un article avant d'en ajouter un.");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("masque une erreur d'insertion imprévue", async () => {
    replies.push({ data: null, error: { message: "check constraint vinted_items_title_check", code: "23514" } });
    expect(await createItem(form())).toEqual({ error: "Impossible d'enregistrer cet article. Réessaie." });
  });

  it("modifie les champs de la fiche sans permettre de changer l'étape ou les dates", async () => {
    replies.push(ok(row({ status: "vendu", sale_price_cents: 1000 })), ok({ id: ID }));
    expect(await updateItem(ID, form({ salePrice: "12.5", buyer: " lea ", status: "termine", completedAt: NOW }))).toEqual({ saved: true, id: ID });
    expect(queries[1].update).toHaveBeenCalledWith(expect.objectContaining({ sale_price_cents: 1250, buyer: "lea", status: "vendu" }));
    expect(queries[1].update.mock.calls[0][0]).not.toHaveProperty("completed_at");
    expect(queries[1].eq).toHaveBeenCalledWith("owner_id", "user-1");
    expect(queries[1].eq).toHaveBeenCalledWith("updated_at", UPDATED);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/vinted");
  });

  it.each([
    { status: "vendu", fields: { salePrice: "" }, expected: "prix de vente" },
    { status: "expedie", fields: { salePrice: "12", carrier: "" }, expected: "transporteur" },
    { status: "a_publier", fields: { title: "" }, expected: "titre" },
  ])("conserve la cohérence de l'article à $status", async ({ status, fields, expected }) => {
    replies.push(ok(row({ status })));
    expect((await updateItem(ID, form(fields))).error).toContain(expected);
    expect(queries).toHaveLength(1);
  });

  it("demande de recharger après une modification concurrente", async () => {
    replies.push(ok(row()), ok(null));
    expect((await updateItem(ID, form())).error).toContain("Recharge la page");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("transitions et suppression", () => {
  it.each([
    ["a_publier", "en_vente", "listed_at"], ["en_vente", "vendu", "sold_at"],
    ["vendu", "expedie", "shipped_at"], ["expedie", "livre", "delivered_at"], ["livre", "termine", "completed_at"],
  ])("avance de %s vers %s avec la date du serveur", async (status, next, date) => {
    replies.push(ok(row({ status, sale_price_cents: 0, carrier: "mondial_relay" })), ok({ id: ID }));
    expect(await advanceItem(ID)).toEqual({ saved: true, id: ID });
    expect(queries[1].update).toHaveBeenCalledWith({ status: next, [date]: NOW });
    expect(queries[1].eq).toHaveBeenCalledWith("owner_id", "user-1");
    expect(queries[1].eq).toHaveBeenCalledWith("updated_at", UPDATED);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/vinted");
  });

  it.each([["en_vente", "prix de vente"], ["vendu", "transporteur"], ["termine", "terminé"]])("bloque l'avancement à %s", async (status, expected) => {
    replies.push(ok(row({ status })));
    expect((await advanceItem(ID)).error).toContain(expected);
    expect(queries).toHaveLength(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("revient d'une étape et efface les dates des étapes quittées", async () => {
    replies.push(ok(row({ status: "vendu", sale_price_cents: 1200, sold_at: NOW })), ok({ id: ID }));
    expect(await backItem(ID)).toEqual({ saved: true, id: ID });
    expect(queries[1].update).toHaveBeenCalledWith({ status: "en_vente", sold_at: null, shipped_at: null, delivered_at: null, completed_at: null });
    expect(queries[1].eq).toHaveBeenCalledWith("owner_id", "user-1");
  });

  it("ne recule pas avant la première étape", async () => {
    replies.push(ok(row()));
    expect((await backItem(ID)).error).toContain("première étape");
    expect(queries).toHaveLength(1);
  });

  it.each(["vendu", "expedie", "livre"])("annule depuis %s en conservant la mise en ligne et les autres champs", async (status) => {
    replies.push(ok(row({ status })), ok({ id: ID }));
    expect(await cancelSale(ID)).toEqual({ saved: true, id: ID });
    expect(queries[1].update).toHaveBeenCalledWith({ status: "en_vente", sale_price_cents: null, buyer: null,
      carrier: null, tracking_number: null, sold_at: null, shipped_at: null, delivered_at: null, completed_at: null });
    expect(queries[1].eq).toHaveBeenCalledWith("owner_id", "user-1");
  });

  it.each(["a_publier", "en_vente", "termine"])("refuse l'annulation depuis %s", async (status) => {
    replies.push(ok(row({ status })));
    expect((await cancelSale(ID)).error).toContain("ne peut pas être annulée");
    expect(queries).toHaveLength(1);
  });

  it("masque les erreurs lors d'un changement d'étape", async () => {
    replies.push(ok(row()), { data: null, error: { message: "constraint vinted_items_status_check" } });
    expect(await advanceItem(ID)).toEqual({ error: "Impossible d'enregistrer cet article. Réessaie." });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("supprime uniquement l'article du propriétaire connecté", async () => {
    replies.push(ok({ id: ID }));
    expect(await deleteItem(ID)).toEqual({ saved: true, id: ID });
    expect(queries[0].delete).toHaveBeenCalledOnce();
    expect(queries[0].eq).toHaveBeenCalledWith("owner_id", "user-1");
    expect(mocks.revalidatePath).toHaveBeenCalledExactlyOnceWith("/dashboard/vinted");
  });
});
