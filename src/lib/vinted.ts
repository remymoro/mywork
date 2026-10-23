// Règles pures du suivi Vinted (docs/vinted.md), sans accès à la base.
import { addDays, isoWeekday, parisDay, parisInstant, parisParts } from "@/lib/rdv";

export const MAX_ITEMS = 500;
export const STATUSES = [
  { id: "a_publier", label: "À mettre en ligne", slug: "a-publier" },
  { id: "en_vente", label: "En vente", slug: "en-vente" },
  { id: "vendu", label: "À expédier", slug: "a-expedier" },
  { id: "expedie", label: "En livraison", slug: "en-livraison" },
  { id: "livre", label: "Livré", slug: "livres" },
  { id: "termine", label: "Terminé", slug: "termines" },
] as const;
export const CONDITIONS = [
  { id: "neuf_avec_etiquette", label: "Neuf avec étiquette" },
  { id: "neuf_sans_etiquette", label: "Neuf sans étiquette" },
  { id: "tres_bon_etat", label: "Très bon état" },
  { id: "bon_etat", label: "Bon état" },
  { id: "satisfaisant", label: "Satisfaisant" },
] as const;
export const CARRIERS = [
  { id: "vinted_go", label: "Vinted Go" },
  { id: "mondial_relay", label: "Mondial Relay" },
  { id: "relais_colis", label: "Relais Colis" },
  { id: "chronopost", label: "Chronopost" },
  { id: "colissimo", label: "Colissimo" },
  { id: "autre", label: "Autre" },
] as const;

export type Status = (typeof STATUSES)[number]["id"];
export type Condition = (typeof CONDITIONS)[number]["id"];
export type Carrier = (typeof CARRIERS)[number]["id"];
export type VintedDates = {
  listedAt: string | null;
  soldAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
};
export type VintedValues = {
  title: string;
  brand: string | null;
  size: string | null;
  condition: Condition | null;
  purchasePriceCents: number | null;
  listingPriceCents: number | null;
  salePriceCents: number | null;
  buyer: string | null;
  carrier: Carrier | null;
  trackingNumber: string | null;
  notes: string | null;
  status: Status;
};
export type VintedItem = VintedValues & VintedDates & {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

/** Prix saisis en euros ; le calcul en centimes évite les arrondis flottants. */
export function parsePrice(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) {
    throw new Error("Saisis un prix entre 0 et 100 000 €, avec deux décimales au maximum.");
  }
  const [euros, decimals = ""] = text.split(/[.,]/);
  const cents = Number(euros) * 100 + Number(decimals.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 10_000_000) {
    throw new Error("Le prix ne peut pas dépasser 100 000 €.");
  }
  return cents;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** Champs camelCase ; purchasePrice, listingPrice et salePrice sont des textes en euros. */
export function validateItem(input: Record<string, unknown>): { values: VintedValues } | { error: string } {
  const limits = { title: 100, brand: 60, size: 20, buyer: 60, trackingNumber: 60, notes: 1000 };
  const labels = { title: "Le titre", brand: "La marque", size: "La taille", buyer: "L'acheteur", trackingNumber: "Le numéro de suivi", notes: "La note" };
  const texts = {} as Record<keyof typeof limits, string>;
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    const raw = input[key] ?? "";
    if (typeof raw !== "string") return { error: `${labels[key]} est invalide.` };
    texts[key] = raw.trim();
    if (texts[key].length > limits[key]) return { error: `${labels[key]} : ${limits[key]} caractères au maximum.` };
  }
  if (!texts.title) return { error: "Donne un titre à l'article." };
  const status = input.status ?? "a_publier";
  const condition = input.condition === "" ? null : input.condition ?? null;
  const carrier = input.carrier === "" ? null : input.carrier ?? null;
  if (!STATUSES.some((s) => s.id === status)) return { error: "Étape invalide." };
  if (condition !== null && !CONDITIONS.some((c) => c.id === condition)) return { error: "État invalide." };
  if (carrier !== null && !CARRIERS.some((c) => c.id === carrier)) return { error: "Transporteur invalide." };
  const prices: (number | null)[] = [];
  for (const key of ["purchasePrice", "listingPrice", "salePrice"]) {
    const raw = input[key] ?? "";
    if (typeof raw !== "string") return { error: "Prix invalide." };
    try {
      prices.push(parsePrice(raw));
    } catch (error) {
      return { error: (error as Error).message };
    }
  }
  const [purchasePriceCents, listingPriceCents, salePriceCents] = prices;
  if (["vendu", "expedie", "livre", "termine"].includes(status as Status) && salePriceCents === null) {
    return { error: "Indique le prix de vente." };
  }
  if (["expedie", "livre", "termine"].includes(status as Status) && carrier === null) {
    return { error: "Choisis un transporteur." };
  }
  return { values: {
    title: texts.title, brand: texts.brand || null, size: texts.size || null,
    buyer: texts.buyer || null, trackingNumber: texts.trackingNumber || null, notes: texts.notes || null,
    condition: condition as Condition | null, carrier: carrier as Carrier | null, status: status as Status,
    purchasePriceCents, listingPriceCents, salePriceCents,
  } };
}

export function nextStatus(status: Status): Status | null {
  return STATUSES[STATUSES.findIndex((s) => s.id === status) + 1]?.id ?? null;
}

export function previousStatus(status: Status): Status | null {
  return STATUSES[STATUSES.findIndex((s) => s.id === status) - 1]?.id ?? null;
}

/** Glisser-déposer : seules les colonnes voisines sont permises (une étape à la fois). */
export function moveFor(from: Status, to: Status): "advance" | "back" | "same" | null {
  if (from === to) return "same";
  if (nextStatus(from) === to) return "advance";
  if (previousStatus(from) === to) return "back";
  return null;
}

export function canAdvance(item: Pick<VintedItem, "status" | "salePriceCents" | "carrier">): string | null {
  if (item.status === "termine") return "Cet article est déjà terminé.";
  if (item.status === "en_vente" && item.salePriceCents === null) return "Indique le prix de vente avant de passer à « À expédier ».";
  if (item.status === "vendu" && item.carrier === null) return "Choisis un transporteur avant de passer à « En livraison ».";
  return null;
}

const DATE_FIELDS = [null, "listedAt", "soldAt", "shippedAt", "deliveredAt", "completedAt"] as const;

export function datesForTransition(from: Status, to: Status, now: Date): Partial<VintedDates> {
  const start = STATUSES.findIndex((s) => s.id === from);
  const end = STATUSES.findIndex((s) => s.id === to);
  const dates: Partial<VintedDates> = {};
  if (end > start) {
    const field = DATE_FIELDS[end];
    if (field) dates[field] = now.toISOString();
  } else if (end < start) {
    for (let i = end + 1; i < DATE_FIELDS.length; i++) {
      const field = DATE_FIELDS[i];
      if (field) dates[field] = null;
    }
  }
  return dates;
}

export function cancelSale(): Pick<VintedItem, "status" | "salePriceCents" | "buyer" | "carrier" | "trackingNumber" | "soldAt" | "shippedAt" | "deliveredAt" | "completedAt"> {
  return { status: "en_vente", salePriceCents: null, buyer: null, carrier: null, trackingNumber: null,
    soldAt: null, shippedAt: null, deliveredAt: null, completedAt: null };
}

function onParisDay(date: Date, day: string): Date {
  const { hour, minute } = parisParts(date);
  return new Date(parisInstant(day, `${hour}:${minute}`).getTime() + date.getUTCSeconds() * 1000 + date.getUTCMilliseconds());
}

/** L'heure locale est conservée, même lors d'un changement d'heure à Paris. */
export function addBusinessDays(date: Date, days = 5): Date {
  if (!Number.isInteger(days) || days < 0) throw new Error("Nombre de jours invalide.");
  if (days === 0) return new Date(date);
  let day = parisDay(date);
  for (let remaining = days; remaining > 0;) {
    day = addDays(day, 1);
    if (isoWeekday(day) <= 5) remaining--;
  }
  return onParisDay(date, day);
}

export function shipDeadline(item: Pick<VintedItem, "soldAt">): Date | null {
  return item.soldAt ? addBusinessDays(new Date(item.soldAt), 5) : null;
}

export function isLate(item: Pick<VintedItem, "status" | "soldAt">, now: Date): boolean {
  const deadline = shipDeadline(item);
  return item.status === "vendu" && deadline !== null && now.getTime() > deadline.getTime();
}

export function moneyAvailableOn(item: Pick<VintedItem, "deliveredAt">): Date | null {
  if (!item.deliveredAt) return null;
  const delivered = new Date(item.deliveredAt);
  return onParisDay(delivered, addDays(parisDay(delivered), 2));
}

export type VintedStats = {
  onSale: { count: number; valueCents: number };
  toShip: { count: number; late: number };
  monthSales: { count: number; totalCents: number };
  monthMarginCents: number;
  pendingCents: number;
};

export function stats(items: readonly VintedItem[], now: Date): VintedStats {
  const result: VintedStats = { onSale: { count: 0, valueCents: 0 }, toShip: { count: 0, late: 0 },
    monthSales: { count: 0, totalCents: 0 }, monthMarginCents: 0, pendingCents: 0 };
  const month = parisDay(now).slice(0, 7);
  for (const item of items) {
    if (item.status === "en_vente") {
      result.onSale.count++;
      result.onSale.valueCents += item.listingPriceCents ?? 0;
    }
    if (item.status === "vendu") {
      result.toShip.count++;
      if (isLate(item, now)) result.toShip.late++;
    }
    if (["vendu", "expedie", "livre"].includes(item.status)) result.pendingCents += item.salePriceCents ?? 0;
    if (["vendu", "expedie", "livre", "termine"].includes(item.status) && item.soldAt && parisDay(new Date(item.soldAt)).slice(0, 7) === month) {
      result.monthSales.count++;
      result.monthSales.totalCents += item.salePriceCents ?? 0;
      if (item.purchasePriceCents !== null && item.salePriceCents !== null) {
        result.monthMarginCents += item.salePriceCents - item.purchasePriceCents;
      }
    }
  }
  return result;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Un slug absent ou inconnu affiche tous les articles. */
export function filterItems(items: readonly VintedItem[], slug: string | null | undefined, query: string): VintedItem[] {
  const status = STATUSES.find((s) => s.slug === slug)?.id;
  const needle = normalize(query.trim());
  return items.filter((item) => (!status || item.status === status)
    && (!needle || normalize(item.title).includes(needle) || normalize(item.brand ?? "").includes(needle)))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function countsByStatus(items: readonly VintedItem[]): Record<Status, number> {
  const counts = Object.fromEntries(STATUSES.map((s) => [s.id, 0])) as Record<Status, number>;
  for (const item of items) counts[item.status]++;
  return counts;
}
