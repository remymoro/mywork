import { describe, expect, it, vi } from "vitest";
import { loadVinted } from "./data";

function fakeSupabase(data: unknown, error: { message: string } | null = null) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error }),
  };
  const from = vi.fn().mockReturnValue(query);
  return { client: { from } as never, from, query };
}

describe("loadVinted", () => {
  it("lit les articles du propriétaire, du plus récent au plus ancien, dans la limite de 500", async () => {
    const { client, from, query } = fakeSupabase([{
      id: "article-1", owner_id: "user-1", title: "Robe", brand: "Sézane", size: "M", condition: "bon_etat",
      purchase_price_cents: 0, listing_price_cents: 2500, sale_price_cents: 2000,
      buyer: "lea", carrier: "vinted_go", tracking_number: "123", notes: "Fragile", status: "termine",
      listed_at: "2026-10-01T10:00:00Z", sold_at: "2026-10-02T10:00:00Z", shipped_at: "2026-10-03T10:00:00Z",
      delivered_at: "2026-10-04T10:00:00Z", completed_at: "2026-10-06T10:00:00Z",
      created_at: "2026-10-01T09:00:00Z", updated_at: "2026-10-06T10:00:00Z",
    }]);
    expect(await loadVinted(client, "user-1")).toEqual([{
      id: "article-1", ownerId: "user-1", title: "Robe", brand: "Sézane", size: "M", condition: "bon_etat",
      purchasePriceCents: 0, listingPriceCents: 2500, salePriceCents: 2000,
      buyer: "lea", carrier: "vinted_go", trackingNumber: "123", notes: "Fragile", status: "termine",
      listedAt: "2026-10-01T10:00:00Z", soldAt: "2026-10-02T10:00:00Z", shippedAt: "2026-10-03T10:00:00Z",
      deliveredAt: "2026-10-04T10:00:00Z", completedAt: "2026-10-06T10:00:00Z",
      createdAt: "2026-10-01T09:00:00Z", updatedAt: "2026-10-06T10:00:00Z",
    }]);
    expect(from).toHaveBeenCalledWith("vinted_items");
    expect(query.eq).toHaveBeenCalledWith("owner_id", "user-1");
    expect(query.order).toHaveBeenCalledWith("updated_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(500);
  });

  it("conserve les champs facultatifs absents", async () => {
    const { client } = fakeSupabase([{ id: "1", brand: null, sale_price_cents: null, sold_at: null, carrier: null }]);
    expect((await loadVinted(client, "user-1"))[0]).toMatchObject({ brand: null, salePriceCents: null, soldAt: null, carrier: null });
  });

  it("renvoie une liste vide sans article", async () => {
    expect(await loadVinted(fakeSupabase(null).client, "user-1")).toEqual([]);
  });

  it("explique une erreur sans en révéler les détails", async () => {
    await expect(loadVinted(fakeSupabase(null, { message: "permission denied for vinted_items" }).client, "user-1"))
      .rejects.toThrow("Impossible de charger les articles Vinted. Réessaie.");
  });
});
