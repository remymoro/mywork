"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  cancelSale as cancelledSale,
  canAdvance,
  datesForTransition,
  nextStatus,
  previousStatus,
  validateItem,
  type VintedDates,
  type VintedItem,
  type VintedValues,
} from "@/lib/vinted";
import { mapVintedItem } from "./data";

export type VintedActionResult = { error?: string; saved?: boolean; id?: string };
type Supabase = Awaited<ReturnType<typeof createClient>>;
type Session = { supabase: Supabase; userId: string };
type Patch = Partial<VintedValues & VintedDates>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS: Record<keyof Patch, string> = {
  title: "title", brand: "brand", size: "size", condition: "condition",
  purchasePriceCents: "purchase_price_cents", listingPriceCents: "listing_price_cents",
  salePriceCents: "sale_price_cents", buyer: "buyer", carrier: "carrier",
  trackingNumber: "tracking_number", notes: "notes", status: "status",
  listedAt: "listed_at", soldAt: "sold_at", shippedAt: "shipped_at",
  deliveredAt: "delivered_at", completedAt: "completed_at",
};

async function currentUser(): Promise<Session> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

function saved(id: string): VintedActionResult {
  revalidatePath("/dashboard/vinted");
  return { saved: true, id };
}

/** Ne jamais renvoyer les détails internes de Postgres au navigateur. */
function databaseMessage(error: { message: string } | null): string {
  if (error?.message.includes("500 articles au maximum")) return "500 articles au maximum : supprime un article avant d'en ajouter un.";
  return "Impossible d'enregistrer cet article. Réessaie.";
}

function databaseValues(patch: Patch): Record<string, unknown> {
  return Object.fromEntries((Object.keys(patch) as (keyof Patch)[]).map((key) => [COLUMNS[key], patch[key]]));
}

async function ownedItem(session: Session, id: string): Promise<{ item: VintedItem } | { error: string }> {
  if (typeof id !== "string" || !UUID.test(id)) return { error: "Article introuvable." };
  const { data, error } = await session.supabase.from("vinted_items")
    .select("*").eq("id", id).eq("owner_id", session.userId).maybeSingle();
  if (error) return { error: "Impossible de lire cet article. Réessaie." };
  if (!data) return { error: "Article introuvable." };
  return { item: mapVintedItem(data) };
}

async function update(session: Session, item: VintedItem, patch: Patch): Promise<VintedActionResult> {
  const { data, error } = await session.supabase.from("vinted_items").update(databaseValues(patch))
    .eq("id", item.id).eq("owner_id", session.userId)
    // Une autre fenêtre a pu modifier l'article entre sa lecture et l'enregistrement.
    .eq("updated_at", item.updatedAt).select("id").maybeSingle();
  if (error) return { error: databaseMessage(error) };
  if (!data) return { error: "Cet article a changé ou n'est plus disponible. Recharge la page." };
  return saved(item.id);
}

export async function createItem(formData: FormData): Promise<VintedActionResult> {
  const session = await currentUser();
  const checked = validateItem({ ...Object.fromEntries(formData), status: "a_publier" });
  if ("error" in checked) return checked;
  const { data, error } = await session.supabase.from("vinted_items")
    .insert({ ...databaseValues(checked.values), owner_id: session.userId }).select("id").single();
  if (error || !data) return { error: databaseMessage(error) };
  return saved(data.id as string);
}

export async function updateItem(id: string, formData: FormData): Promise<VintedActionResult> {
  const session = await currentUser();
  const found = await ownedItem(session, id);
  if ("error" in found) return found;
  const checked = validateItem({ ...Object.fromEntries(formData), status: found.item.status });
  if ("error" in checked) return checked;
  return update(session, found.item, checked.values);
}

export async function advanceItem(id: string): Promise<VintedActionResult> {
  const session = await currentUser();
  const found = await ownedItem(session, id);
  if ("error" in found) return found;
  const reason = canAdvance(found.item);
  if (reason) return { error: reason };
  const status = nextStatus(found.item.status);
  if (!status) return { error: "Cet article est déjà terminé." };
  return update(session, found.item, { status, ...datesForTransition(found.item.status, status, new Date()) });
}

export async function backItem(id: string): Promise<VintedActionResult> {
  const session = await currentUser();
  const found = await ownedItem(session, id);
  if ("error" in found) return found;
  const status = previousStatus(found.item.status);
  if (!status) return { error: "Cet article est déjà à la première étape." };
  return update(session, found.item, { status, ...datesForTransition(found.item.status, status, new Date()) });
}

export async function cancelSale(id: string): Promise<VintedActionResult> {
  const session = await currentUser();
  const found = await ownedItem(session, id);
  if ("error" in found) return found;
  if (!["vendu", "expedie", "livre"].includes(found.item.status)) return { error: "Cette vente ne peut pas être annulée à cette étape." };
  return update(session, found.item, cancelledSale());
}

export async function deleteItem(id: string): Promise<VintedActionResult> {
  const session = await currentUser();
  if (typeof id !== "string" || !UUID.test(id)) return { error: "Article introuvable." };
  const { data, error } = await session.supabase.from("vinted_items").delete()
    .eq("id", id).eq("owner_id", session.userId).select("id").maybeSingle();
  if (error) return { error: "Impossible de supprimer cet article. Réessaie." };
  if (!data) return { error: "Article introuvable." };
  return saved(id);
}
