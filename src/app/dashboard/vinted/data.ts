import type { createClient } from "@/lib/supabase/server";
import { MAX_ITEMS, type VintedItem } from "@/lib/vinted";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export function mapVintedItem(row: Record<string, unknown>): VintedItem {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    title: row.title as string,
    brand: row.brand as VintedItem["brand"],
    size: row.size as VintedItem["size"],
    condition: row.condition as VintedItem["condition"],
    purchasePriceCents: row.purchase_price_cents as number | null,
    listingPriceCents: row.listing_price_cents as number | null,
    salePriceCents: row.sale_price_cents as number | null,
    buyer: row.buyer as VintedItem["buyer"],
    carrier: row.carrier as VintedItem["carrier"],
    trackingNumber: row.tracking_number as VintedItem["trackingNumber"],
    notes: row.notes as VintedItem["notes"],
    status: row.status as VintedItem["status"],
    listedAt: row.listed_at as string | null,
    soldAt: row.sold_at as string | null,
    shippedAt: row.shipped_at as string | null,
    deliveredAt: row.delivered_at as string | null,
    completedAt: row.completed_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function loadVinted(supabase: Supabase, userId: string): Promise<VintedItem[]> {
  const { data, error } = await supabase.from("vinted_items")
    .select("*").eq("owner_id", userId).order("updated_at", { ascending: false }).limit(MAX_ITEMS);
  if (error) throw new Error("Impossible de charger les articles Vinted. Réessaie.");
  return (data ?? []).map(mapVintedItem);
}
