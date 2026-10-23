import { describe, expect, it } from "vitest";
import {
  STATUSES, CONDITIONS, CARRIERS, MAX_ITEMS, parsePrice, formatPrice, validateItem,
  nextStatus, previousStatus, canAdvance, datesForTransition, cancelSale, addBusinessDays,
  shipDeadline, isLate, moneyAvailableOn, stats, filterItems, countsByStatus, type VintedItem,
} from "./vinted";

function item(patch: Partial<VintedItem> = {}): VintedItem {
  return {
    id: "article-1", ownerId: "proprietaire", title: "Robe", brand: null, size: null, condition: null,
    purchasePriceCents: null, listingPriceCents: null, salePriceCents: null, buyer: null,
    carrier: null, trackingNumber: null, notes: null, status: "a_publier", listedAt: null,
    soldAt: null, shippedAt: null, deliveredAt: null, completedAt: null,
    createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", ...patch,
  };
}

describe("prix et validation Vinted", () => {
  it.each([["12,50", 1250], ["12.5", 1250], ["", null], ["  ", null], [" 0 ", 0],
    ["0,01", 1], ["1.01", 101], ["100000,00", 10_000_000], ["00012.50", 1250]])("lit %s", (raw, expected) => {
    expect(parsePrice(raw as string)).toBe(expected);
  });

  it.each(["-1", "-0", "100000.01", "9999999999999999999", "12,500", "12.345", "1e2", "NaN", "Infinity", "+2", "1 000", "12,", ".5", "12,5.0", "12 €"])("refuse %s", (raw) => {
    expect(() => parsePrice(raw)).toThrow();
  });

  it("affiche les euros en français avec deux décimales", () => {
    expect(formatPrice(1250).replace(/\s/g, " ")).toBe("12,50 €");
    expect(formatPrice(0).replace(/\s/g, " ")).toBe("0,00 €");
  });

  it("nettoie le formulaire et conserve les zéros", () => {
    expect(validateItem({ title: "  Robe  ", brand: "  Sézane ", purchasePrice: "0", listingPrice: "12,5", salePrice: "", condition: "", carrier: "" })).toEqual({ values: {
      title: "Robe", brand: "Sézane", size: null, buyer: null, trackingNumber: null, notes: null,
      purchasePriceCents: 0, listingPriceCents: 1250, salePriceCents: null,
      condition: null, carrier: null, status: "a_publier",
    } });
  });

  it.each([{}, { title: " \n " }, { title: 12 }, { title: "a".repeat(101) }, { brand: "b".repeat(61) },
    { size: "s".repeat(21) }, { buyer: "b".repeat(61) }, { trackingNumber: "n".repeat(61) }, { notes: "n".repeat(1001) },
    { condition: "abime" }, { carrier: "poste" }, { status: "inconnu" }, { brand: {} },
    { purchasePrice: 12 }, { listingPrice: "-1" }, { salePrice: "100001" }])("refuse un champ invalide : %j", (patch) => {
    const input = Object.keys(patch).length ? { title: "Robe", ...patch } : patch;
    expect(validateItem(input)).toHaveProperty("error");
  });

  it("accepte les longueurs maximales et toutes les énumérations", () => {
    expect(MAX_ITEMS).toBe(500);
    expect(STATUSES.map((s) => s.slug)).toEqual(["a-publier", "en-vente", "a-expedier", "en-livraison", "livres", "termines"]);
    for (const status of STATUSES) for (const condition of CONDITIONS) for (const carrier of CARRIERS) {
      expect(validateItem({ title: "t".repeat(100), brand: "b".repeat(60), size: "s".repeat(20),
        buyer: "b".repeat(60), trackingNumber: "n".repeat(60), notes: "n".repeat(1000),
        status: status.id, condition: condition.id, carrier: carrier.id, salePrice: "0" })).toHaveProperty("values");
    }
  });

  it.each(["vendu", "expedie", "livre", "termine"])("exige un prix de vente à l'étape %s", (status) => {
    expect(validateItem({ title: "Robe", status, carrier: "autre" })).toEqual({ error: "Indique le prix de vente." });
  });
  it.each(["expedie", "livre", "termine"])("exige un transporteur à l'étape %s", (status) => {
    expect(validateItem({ title: "Robe", status, salePrice: "0" })).toEqual({ error: "Choisis un transporteur." });
  });
});

describe("étapes et annulation", () => {
  const now = new Date("2026-10-23T12:00:00Z");
  const fields = ["listedAt", "soldAt", "shippedAt", "deliveredAt", "completedAt"];

  it("avance et recule d'une étape, avec des bornes", () => {
    STATUSES.forEach((s, i) => {
      expect(nextStatus(s.id)).toBe(STATUSES[i + 1]?.id ?? null);
      expect(previousStatus(s.id)).toBe(STATUSES[i - 1]?.id ?? null);
    });
  });

  it("bloque uniquement si l'information nécessaire manque", () => {
    expect(canAdvance(item())).toBeNull();
    expect(canAdvance(item({ status: "en_vente" }))).toContain("prix de vente");
    expect(canAdvance(item({ status: "en_vente", salePriceCents: 0 }))).toBeNull();
    expect(canAdvance(item({ status: "vendu", salePriceCents: 10 }))).toContain("transporteur");
    expect(canAdvance(item({ status: "vendu", salePriceCents: 10, carrier: "autre" }))).toBeNull();
    expect(canAdvance(item({ status: "expedie" }))).toBeNull();
    expect(canAdvance(item({ status: "livre" }))).toBeNull();
    expect(canAdvance(item({ status: "termine" }))).toContain("terminé");
  });

  it("date chaque étape atteinte et efface toutes les dates ultérieures au retour", () => {
    for (let i = 0; i < STATUSES.length - 1; i++) {
      const from = STATUSES[i].id;
      const to = STATUSES[i + 1].id;
      expect(datesForTransition(from, to, now)).toEqual({ [fields[i]]: now.toISOString() });
      expect(datesForTransition(to, from, now)).toEqual(Object.fromEntries(fields.slice(i).map((key) => [key, null])));
    }
    expect(datesForTransition("vendu", "vendu", now)).toEqual({});
  });

  it("annule la vente en gardant les informations de l'article et la mise en ligne", () => {
    const original = item({ status: "livre", title: "Robe bleue", purchasePriceCents: 100, listingPriceCents: 900,
      listedAt: "2026-10-01T00:00:00Z", salePriceCents: 800, buyer: "lea", carrier: "vinted_go",
      trackingNumber: "abc", soldAt: now.toISOString(), shippedAt: now.toISOString(), deliveredAt: now.toISOString() });
    expect({ ...original, ...cancelSale() }).toEqual({ ...original, status: "en_vente", salePriceCents: null,
      buyer: null, carrier: null, trackingNumber: null, soldAt: null, shippedAt: null, deliveredAt: null, completedAt: null });
  });
});

describe("délais", () => {
  it.each([
    ["2026-10-19T10:00:00Z", "2026-10-26T11:00:00Z"],
    ["2026-10-23T10:00:00Z", "2026-10-30T11:00:00Z"],
    ["2026-10-24T10:00:00Z", "2026-10-30T11:00:00Z"],
    ["2026-10-25T11:00:00Z", "2026-10-30T11:00:00Z"],
    ["2026-03-27T11:00:00Z", "2026-04-03T10:00:00Z"],
    ["2026-12-31T11:00:00Z", "2027-01-07T11:00:00Z"],
  ])("ajoute cinq jours ouvrés à %s (sans jours fériés)", (from, to) => {
    expect(addBusinessDays(new Date(from), 5).toISOString()).toBe(new Date(to).toISOString());
    expect(shipDeadline(item({ soldAt: from }))?.toISOString()).toBe(new Date(to).toISOString());
  });

  it("conserve l'heure parisienne près de minuit et ne modifie pas la date d'origine", () => {
    const start = new Date("2026-10-23T22:30:12.123Z"); // Samedi à Paris.
    expect(addBusinessDays(start).toISOString()).toBe("2026-10-29T23:30:12.123Z");
    expect(start.toISOString()).toBe("2026-10-23T22:30:12.123Z");
    expect(addBusinessDays(start, 0)).toEqual(start);
    expect(addBusinessDays(start, 0)).not.toBe(start);
    expect(() => addBusinessDays(start, -1)).toThrow();
    expect(() => addBusinessDays(start, 1.5)).toThrow();
    expect(shipDeadline(item())).toBeNull();
  });

  it("est en retard seulement après l'échéance et tant qu'il reste à expédier", () => {
    const sold = item({ status: "vendu", soldAt: "2026-10-23T10:00:00Z" });
    const deadline = new Date("2026-10-30T11:00:00Z");
    expect(isLate(sold, new Date(deadline.getTime() - 1))).toBe(false);
    expect(isLate(sold, deadline)).toBe(false);
    expect(isLate(sold, new Date(deadline.getTime() + 1))).toBe(true);
    expect(isLate({ ...sold, status: "expedie" }, new Date("2026-11-01"))).toBe(false);
    expect(isLate(item({ status: "vendu" }), deadline)).toBe(false);
  });

  it("ajoute deux jours calendaires après livraison, week-end inclus", () => {
    expect(moneyAvailableOn(item())).toBeNull();
    expect(moneyAvailableOn(item({ deliveredAt: "2026-10-23T10:00:00Z" }))?.toISOString()).toBe("2026-10-25T11:00:00.000Z");
  });
});

describe("statistiques", () => {
  const now = new Date("2026-10-31T23:30:00Z"); // 1er novembre à Paris.

  it("renvoie des compteurs vides sans article", () => {
    expect(stats([], now)).toEqual({ onSale: { count: 0, valueCents: 0 }, toShip: { count: 0, late: 0 },
      monthSales: { count: 0, totalCents: 0 }, monthMarginCents: 0, pendingCents: 0 });
  });

  it("compte les ventes au mois parisien, les marges connues et l'argent encore attendu", () => {
    const items = [
      item({ status: "a_publier", listingPriceCents: 99999 }),
      item({ status: "en_vente", listingPriceCents: 1200 }), item({ status: "en_vente" }),
      item({ status: "vendu", soldAt: "2026-10-01T10:00:00Z", salePriceCents: 1000 }),
      item({ status: "vendu", soldAt: "2026-10-31T23:00:00Z", salePriceCents: 2000, purchasePriceCents: 0 }),
      item({ status: "expedie", soldAt: "2026-11-01T00:00:00Z", salePriceCents: 3000 }),
      item({ status: "livre", soldAt: "2026-11-02T00:00:00Z", salePriceCents: 500, purchasePriceCents: 800 }),
      item({ status: "termine", soldAt: "2026-11-03T00:00:00Z", salePriceCents: 400, purchasePriceCents: 100 }),
      item({ status: "termine", soldAt: "2025-11-03T00:00:00Z", salePriceCents: 90000 }),
      item({ status: "en_vente", soldAt: null, salePriceCents: null }),
    ];
    expect(stats(items, now)).toEqual({ onSale: { count: 3, valueCents: 1200 }, toShip: { count: 2, late: 1 },
      monthSales: { count: 4, totalCents: 5900 }, monthMarginCents: 2000, pendingCents: 6500 });
  });

  it("respecte aussi la frontière du mois en heure d'été", () => {
    const sold = item({ status: "termine", soldAt: "2026-06-30T22:30:00Z", salePriceCents: 0, purchasePriceCents: 100 });
    expect(stats([sold], new Date("2026-07-01T12:00:00Z"))).toMatchObject({ monthSales: { count: 1, totalCents: 0 }, monthMarginCents: -100 });
  });
});

describe("filtres, tri et compteurs", () => {
  const items = [
    item({ id: "1", title: "Écharpe", status: "en_vente", updatedAt: "2026-10-02T12:00:00Z" }),
    item({ id: "2", title: "Robe", brand: "SÉZANE", status: "vendu", updatedAt: "2026-10-03T12:00:00Z" }),
    item({ id: "3", title: "Écharpe bleue", status: "vendu", updatedAt: "2026-10-01T12:00:00Z" }),
  ];
  it("cherche dans le titre ou la marque sans accents ni majuscules", () => {
    expect(filterItems(items, null, " ECHARPE ").map((i) => i.id)).toEqual(["1", "3"]);
    expect(filterItems(items, "a-expedier", "sezane").map((i) => i.id)).toEqual(["2"]);
    expect(filterItems(items, "en-vente", "sezane")).toEqual([]);
  });
  it("trie sans modifier la liste initiale et accepte le filtre Tous ou inconnu", () => {
    for (const slug of [undefined, "tous", "inconnu", ""]) {
      expect(filterItems(items, slug, "").map((i) => i.id)).toEqual(["2", "1", "3"]);
    }
    expect(items.map((i) => i.id)).toEqual(["1", "2", "3"]);
    for (const s of STATUSES) expect(filterItems([item({ status: s.id })], s.slug, "")).toHaveLength(1);
  });
  it("compte chaque étape, même vide", () => {
    expect(countsByStatus(items)).toEqual({ a_publier: 0, en_vente: 1, vendu: 2, expedie: 0, livre: 0, termine: 0 });
    expect(Object.values(countsByStatus([]))).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
