"use client";

import { useState, useTransition, type FormEvent, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Copy,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import {
  advanceItem,
  backItem,
  cancelSale,
  createItem,
  deleteItem,
  updateItem,
  type VintedActionResult,
} from "@/app/dashboard/vinted/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CARRIERS,
  CONDITIONS,
  STATUSES,
  canAdvance,
  countsByStatus,
  filterItems,
  formatPrice,
  isLate,
  moneyAvailableOn,
  nextStatus,
  parsePrice,
  shipDeadline,
  stats,
  type Status,
  type VintedItem,
} from "@/lib/vinted";

const NETWORK_ERROR = "La connexion a été interrompue. Réessaie dans un instant.";

const parisDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

function formatShortDate(date: Date): string {
  return parisDateFormatter.format(date);
}

/** Convertit des centimes en texte d'euros avec virgule (ex. 1250 -> "12,50"). */
function centsToEurosInput(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

function safeParsePrice(raw: string): number | null {
  try {
    return parsePrice(raw);
  } catch {
    return null;
  }
}

function statusLabel(status: Status): string {
  return STATUSES.find((s) => s.id === status)?.label ?? status;
}

function conditionLabel(condition: VintedItem["condition"]): string | null {
  if (!condition) return null;
  return CONDITIONS.find((c) => c.id === condition)?.label ?? null;
}

function carrierLabel(carrier: VintedItem["carrier"]): string | null {
  if (!carrier) return null;
  return CARRIERS.find((c) => c.id === carrier)?.label ?? null;
}

function badgeVariantForStatus(
  status: Status,
): "default" | "secondary" | "destructive" | "success" | "accent" | "outline" {
  switch (status) {
    case "vendu":
      return "accent";
    case "expedie":
      return "outline";
    case "livre":
    case "termine":
      return "success";
    default:
      return "secondary";
  }
}

function stepDateForStatus(item: VintedItem, status: Status): string | null {
  switch (status) {
    case "a_publier":
      return item.createdAt;
    case "en_vente":
      return item.listedAt;
    case "vendu":
      return item.soldAt;
    case "expedie":
      return item.shippedAt;
    case "livre":
      return item.deliveredAt;
    case "termine":
      return item.completedAt;
  }
}

type FormState = {
  title: string;
  brand: string;
  size: string;
  condition: string;
  purchasePrice: string;
  listingPrice: string;
  salePrice: string;
  buyer: string;
  carrier: string;
  trackingNumber: string;
  notes: string;
};

function emptyFormState(): FormState {
  return {
    title: "",
    brand: "",
    size: "",
    condition: "",
    purchasePrice: "",
    listingPrice: "",
    salePrice: "",
    buyer: "",
    carrier: "",
    trackingNumber: "",
    notes: "",
  };
}

function itemToFormState(item: VintedItem): FormState {
  return {
    title: item.title,
    brand: item.brand ?? "",
    size: item.size ?? "",
    condition: item.condition ?? "",
    purchasePrice: centsToEurosInput(item.purchasePriceCents),
    listingPrice: centsToEurosInput(item.listingPriceCents),
    salePrice: centsToEurosInput(item.salePriceCents),
    buyer: item.buyer ?? "",
    carrier: item.carrier ?? "",
    trackingNumber: item.trackingNumber ?? "",
    notes: item.notes ?? "",
  };
}

function ItemDeadline({ item, nowDate }: { item: VintedItem; nowDate: Date }) {
  if (item.status === "vendu") {
    const deadline = shipDeadline(item);
    const late = isLate(item, nowDate);
    if (late) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
          <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
          <span>
            {deadline
              ? `En retard · À expédier avant le ${formatShortDate(deadline)}`
              : "En retard · À expédier"}
          </span>
        </span>
      );
    }
    if (deadline) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Clock aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          <span>À expédier avant le {formatShortDate(deadline)}</span>
        </span>
      );
    }
  }

  if (item.status === "livre") {
    const available = moneyAvailableOn(item);
    if (available) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <Wallet aria-hidden="true" className="size-3.5 shrink-0" />
          <span>Argent dispo vers le {formatShortDate(available)}</span>
        </span>
      );
    }
  }

  if (item.status === "expedie") {
    const carrier = carrierLabel(item.carrier);
    const details = [carrier, item.trackingNumber].filter(Boolean).join(" · ");
    if (details) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck aria-hidden="true" className="size-3.5 shrink-0" />
          <span>{details}</span>
        </span>
      );
    }
  }

  if (item.status === "en_vente" && item.listedAt) {
    return (
      <span className="text-xs text-muted-foreground">
        Mis en ligne le {formatShortDate(new Date(item.listedAt))}
      </span>
    );
  }

  if (item.status === "termine" && item.completedAt) {
    return (
      <span className="text-xs text-muted-foreground">
        Argent reçu le {formatShortDate(new Date(item.completedAt))}
      </span>
    );
  }

  if (item.status === "a_publier") {
    return <span className="text-xs text-muted-foreground">En stock · Prêt à publier</span>;
  }

  return null;
}

export function VintedWorkspace({
  items,
  stage,
  now,
}: {
  items: VintedItem[];
  stage: string | null;
  now: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyFormState);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const nowDate = new Date(now);
  const kpi = stats(items, nowDate);
  const counts = countsByStatus(items);
  const activeTabSlug =
    STATUSES.find((s) => s.slug === stage || s.id === stage)?.slug ?? null;
  const visibleItems = filterItems(items, activeTabSlug, query);
  const activeItem = activeItemId
    ? items.find((item) => item.id === activeItemId) ?? null
    : null;

  function openCreateDialog() {
    setDialogMode("create");
    setActiveItemId(null);
    setForm(emptyFormState());
    setErrorMessage("");
    setConfirmCancel(false);
    setConfirmDelete(false);
    setCopied(false);
  }

  function openEditDialog(item: VintedItem, initialError = "") {
    setDialogMode("edit");
    setActiveItemId(item.id);
    setForm(itemToFormState(item));
    setErrorMessage(initialError);
    setConfirmCancel(false);
    setConfirmDelete(false);
    setCopied(false);
  }

  function closeDialog() {
    setDialogMode(null);
    setActiveItemId(null);
    setErrorMessage("");
    setConfirmCancel(false);
    setConfirmDelete(false);
    setCopied(false);
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set("title", form.title);
    fd.set("brand", form.brand);
    fd.set("size", form.size);
    fd.set("condition", form.condition);
    fd.set("purchasePrice", form.purchasePrice);
    fd.set("listingPrice", form.listingPrice);
    fd.set("salePrice", form.salePrice);
    fd.set("buyer", form.buyer);
    fd.set("carrier", form.carrier);
    fd.set("trackingNumber", form.trackingNumber);
    fd.set("notes", form.notes);
    return fd;
  }

  function runAction(
    action: () => Promise<VintedActionResult>,
    options?: { onSuccess?: () => void; onErrorItem?: VintedItem },
  ) {
    setErrorMessage("");
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) {
          if (options?.onErrorItem) {
            openEditDialog(options.onErrorItem, result.error);
          } else {
            setErrorMessage(result.error);
          }
          return;
        }
        options?.onSuccess?.();
        router.refresh();
      } catch {
        if (options?.onErrorItem) {
          openEditDialog(options.onErrorItem, NETWORK_ERROR);
        } else {
          setErrorMessage(NETWORK_ERROR);
        }
      }
    });
  }

  function handleQuickAdvance(event: MouseEvent<HTMLButtonElement>, item: VintedItem) {
    event.stopPropagation();
    const reason = canAdvance(item);
    if (reason) {
      openEditDialog(item, reason);
      return;
    }
    runAction(() => advanceItem(item.id), { onErrorItem: item });
  }

  function handleSubmitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = buildFormData();
    if (dialogMode === "create") {
      runAction(() => createItem(fd), { onSuccess: closeDialog });
    } else if (dialogMode === "edit" && activeItem) {
      runAction(() => updateItem(activeItem.id, fd), { onSuccess: closeDialog });
    }
  }

  function handleDialogAdvance() {
    if (!activeItem) return;
    const fd = buildFormData();
    setErrorMessage("");
    startTransition(async () => {
      try {
        const updateRes = await updateItem(activeItem.id, fd);
        if (updateRes.error) {
          setErrorMessage(updateRes.error);
          return;
        }
        const advanceRes = await advanceItem(activeItem.id);
        if (advanceRes.error) {
          setErrorMessage(advanceRes.error);
          router.refresh();
          return;
        }
        closeDialog();
        router.refresh();
      } catch {
        setErrorMessage(NETWORK_ERROR);
      }
    });
  }

  function handleDialogBack() {
    if (!activeItem) return;
    runAction(() => backItem(activeItem.id), { onSuccess: closeDialog });
  }

  function handleDialogCancelSale() {
    if (!activeItem) return;
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    runAction(() => cancelSale(activeItem.id), { onSuccess: closeDialog });
  }

  function handleDialogDelete() {
    if (!activeItem) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    runAction(() => deleteItem(activeItem.id), { onSuccess: closeDialog });
  }

  async function handleCopyTracking() {
    if (!form.trackingNumber.trim()) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(form.trackingNumber.trim());
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const livePurchaseCents = safeParsePrice(form.purchasePrice);
  const liveSaleCents = safeParsePrice(form.salePrice);
  const liveMarginCents =
    livePurchaseCents !== null && liveSaleCents !== null
      ? liveSaleCents - livePurchaseCents
      : null;

  const currentStepIndex = activeItem
    ? STATUSES.findIndex((s) => s.id === activeItem.status)
    : 0;
  const nextStepId = activeItem ? nextStatus(activeItem.status) : null;

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            ESPACE PRIVÉ
          </p>
          <h1 className="font-heading text-3xl font-normal tracking-tight sm:text-4xl">
            Mes ventes Vinted
          </h1>
          <p className="text-sm text-muted-foreground">
            Suis tes articles du stock jusqu&apos;à l&apos;argent reçu, sans rien oublier.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={openCreateDialog}>
            <Plus aria-hidden="true" className="size-4" />
            <span>Ajouter un article</span>
          </Button>
        </div>
      </div>

      {/* Les 4 chiffres clés (grille 2×2 lisible dès 320 px, 4 colonnes sur grand écran) */}
      <section
        aria-label="Indicateurs du mois"
        className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4"
      >
        <article className="flex min-w-0 flex-col justify-between gap-1.5 rounded-xl border border-border bg-card p-3 sm:p-4">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            En vente
          </span>
          <p className="font-heading text-xl font-medium tracking-tight text-foreground sm:text-3xl">
            {kpi.onSale.count} {kpi.onSale.count > 1 ? "articles" : "article"}
          </p>
          <p className="text-xs text-muted-foreground">
            Valeur affichée :{" "}
            <strong className="font-mono font-medium text-foreground">
              {formatPrice(kpi.onSale.valueCents)}
            </strong>
          </p>
        </article>

        <article
          className={`flex min-w-0 flex-col justify-between gap-1.5 rounded-xl border border-border bg-card p-3 sm:p-4 ${
            kpi.toShip.late > 0 ? "border-t-[3px] border-t-primary" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
              À expédier
            </span>
            {kpi.toShip.late > 0 && (
              <Badge variant="destructive" className="px-1.5 py-0 text-[0.68rem]">
                dont {kpi.toShip.late} en retard
              </Badge>
            )}
          </div>
          <p className="font-heading text-xl font-medium tracking-tight text-foreground sm:text-3xl">
            {kpi.toShip.count} colis
          </p>
          <p className="text-xs text-muted-foreground">
            {kpi.toShip.late > 0
              ? `${kpi.toShip.count - kpi.toShip.late} dans les délais · ${kpi.toShip.late} à déposer vite`
              : kpi.toShip.count > 0
                ? "Tous dans les délais (5 jours ouvrés)"
                : "Aucun colis en attente"}
          </p>
        </article>

        <article className="flex min-w-0 flex-col justify-between gap-1.5 rounded-xl border border-border bg-card p-3 sm:p-4">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Ventes du mois
          </span>
          <p className="font-heading text-xl font-medium tracking-tight text-foreground sm:text-3xl">
            {formatPrice(kpi.monthSales.totalCents)}
          </p>
          <p className="text-xs text-muted-foreground">
            <strong className="font-mono font-medium text-foreground">
              {kpi.monthSales.count} {kpi.monthSales.count > 1 ? "ventes" : "vente"}
            </strong>{" "}
            · en attente : {formatPrice(kpi.pendingCents)}
          </p>
        </article>

        <article className="flex min-w-0 flex-col justify-between gap-1.5 rounded-xl border border-border bg-card p-3 sm:p-4">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Marge du mois
          </span>
          <p
            className={`font-heading text-xl font-medium tracking-tight sm:text-3xl ${
              kpi.monthMarginCents < 0 ? "text-destructive" : "text-success"
            }`}
          >
            {kpi.monthMarginCents > 0 ? "+ " : ""}
            {formatPrice(kpi.monthMarginCents)}
          </p>
          <p className="text-xs text-muted-foreground">
            Prix de vente − prix d&apos;achat
          </p>
        </article>
      </section>

      {/* Barre d'onglets par étape et recherche locale */}
      <section
        aria-label="Filtres et recherche"
        className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4"
      >
        <nav
          aria-label="Filtrer par étape"
          className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3"
        >
          <Link
            href="/dashboard/vinted"
            aria-current={activeTabSlug === null ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
              activeTabSlug === null
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span>Tous</span>
            <span
              className={`rounded-full px-1.5 py-0.5 font-mono text-[0.7rem] ${
                activeTabSlug === null
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {items.length}
            </span>
          </Link>

          {STATUSES.map((s) => {
            const isActive = activeTabSlug === s.slug;
            return (
              <Link
                key={s.id}
                href={`/dashboard/vinted?etape=${s.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{s.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[0.7rem] ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {counts[s.id]}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Label htmlFor="vinted-search" className="sr-only">
              Rechercher par titre ou marque
            </Label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="vinted-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par titre ou marque (ex. Sézane, Levi's…)"
              className="pl-8"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tri : dernier article modifié en premier
          </p>
        </div>
      </section>

      {/* Liste des articles ou états vides */}
      {items.length === 0 ? (
        <section
          aria-label="Aucun article"
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-10 text-center"
        >
          <p className="font-heading text-xl text-foreground">
            Aucun article pour l&apos;instant. Ajoute ton premier article.
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Prépare ton stock, note tes prix d&apos;achat et suis chaque colis jusqu&apos;au
            virement de l&apos;argent.
          </p>
          <Button type="button" onClick={openCreateDialog}>
            <Plus aria-hidden="true" className="size-4" />
            <span>Ajouter un article</span>
          </Button>
        </section>
      ) : visibleItems.length === 0 ? (
        <section
          aria-label="Aucun résultat"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-10 text-center"
        >
          <p className="font-heading text-xl text-foreground">Aucun article ici.</p>
          <p className="text-sm text-muted-foreground">
            Aucun article ne correspond à cette étape ou à ta recherche.
          </p>
        </section>
      ) : (
        <section aria-label="Liste de mes articles" className="space-y-2.5">
          {visibleItems.map((item) => {
            const late = isLate(item, nowDate);
            const cond = conditionLabel(item.condition);
            const metaParts = [item.brand, item.size, cond].filter(Boolean);
            const displayPriceCents = item.salePriceCents ?? item.listingPriceCents;
            const hasMargin =
              item.purchasePriceCents !== null && item.salePriceCents !== null;
            const marginCents = hasMargin
              ? (item.salePriceCents ?? 0) - (item.purchasePriceCents ?? 0)
              : null;

            return (
              <article
                key={item.id}
                onClick={() => openEditDialog(item)}
                className={`flex cursor-pointer flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-muted-foreground sm:p-4 ${
                  late ? "border-l-[3px] border-l-destructive" : ""
                } ${activeItemId === item.id ? "ring-1 ring-primary" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-heading text-base font-medium leading-snug text-foreground sm:text-lg">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(item);
                        }}
                        className="text-left hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        {item.title}
                      </button>
                    </h2>
                    {(metaParts.length > 0 || item.buyer) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {metaParts.join(" · ")}
                        {metaParts.length > 0 && item.buyer ? " · " : ""}
                        {item.buyer && (
                          <span>
                            Acheteur :{" "}
                            <strong className="font-medium text-foreground">
                              {item.buyer}
                            </strong>
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="font-mono text-sm font-semibold text-foreground sm:text-base">
                      {displayPriceCents !== null ? formatPrice(displayPriceCents) : "—"}
                    </span>
                    {marginCents !== null ? (
                      <span
                        className={`block font-mono text-xs ${
                          marginCents < 0 ? "text-destructive" : "text-success"
                        }`}
                      >
                        Marge {marginCents >= 0 ? "+" : ""}
                        {formatPrice(marginCents)}
                      </span>
                    ) : item.purchasePriceCents !== null ? (
                      <span className="block font-mono text-xs text-muted-foreground">
                        Achat {formatPrice(item.purchasePriceCents)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border pt-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={badgeVariantForStatus(item.status)}>
                      {statusLabel(item.status)}
                    </Badge>
                    <ItemDeadline item={item} nowDate={nowDate} />
                  </div>

                  {item.status !== "termine" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      onClick={(e) => handleQuickAdvance(e, item)}
                    >
                      <span>Étape suivante</span>
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Button>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      Vente bouclée ✓
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Fenêtre Fiche article / Nouvel article */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="inset-0 top-0 left-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none border-t-[3px] border-t-primary p-0 sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90dvh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <DialogHeader className="border-b border-border bg-card p-4 pr-10 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {dialogMode === "create" ? "NOUVEL ARTICLE" : "FICHE ARTICLE OUVERTE"}
            </p>
            <DialogTitle className="font-heading text-xl font-medium text-foreground">
              {dialogMode === "edit" && activeItem ? activeItem.title : "Nouvel article"}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
              {dialogMode === "edit" && activeItem ? (
                <>
                  <Badge variant={badgeVariantForStatus(activeItem.status)}>
                    {statusLabel(activeItem.status)}
                  </Badge>
                  <ItemDeadline item={activeItem} nowDate={nowDate} />
                </>
              ) : (
                <span>Renseigne les informations de ton article pour suivre sa vente.</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 p-4 sm:p-6">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Frise des 6 étapes */}
            {dialogMode === "edit" && activeItem && (
              <div
                aria-label="Progression des 6 étapes"
                className="space-y-3 rounded-lg border border-border bg-secondary p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-foreground">
                    Parcours de l&apos;article (étape {currentStepIndex + 1} sur{" "}
                    {STATUSES.length})
                  </span>
                  <span className="text-muted-foreground">
                    Dates enregistrées automatiquement
                  </span>
                </div>

                <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-6">
                  {STATUSES.map((s, idx) => {
                    const isCurrent = idx === currentStepIndex;
                    const isDone = idx < currentStepIndex;
                    const isReached = idx <= currentStepIndex;
                    const rawDate = isReached ? stepDateForStatus(activeItem, s.id) : null;

                    return (
                      <li
                        key={s.id}
                        aria-current={isCurrent ? "step" : undefined}
                        className={`flex min-w-0 flex-col gap-0.5 rounded-md border p-2 text-xs ${
                          isCurrent
                            ? "border-primary bg-accent text-accent-foreground ring-1 ring-primary"
                            : isDone
                              ? "border-border bg-card/80 text-foreground"
                              : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        <span className="flex items-center justify-between font-mono text-[0.65rem] font-semibold">
                          <span>{idx + 1}</span>
                          {isDone && <Check aria-hidden="true" className="size-3" />}
                          {isCurrent && <span aria-hidden="true">●</span>}
                        </span>
                        <span className="truncate font-semibold">{s.label}</span>
                        <span className="truncate text-[0.65rem] opacity-80">
                          {rawDate ? formatShortDate(new Date(rawDate)) : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ol>

                <div className="flex flex-wrap items-center gap-2">
                  {activeItem.status !== "termine" && nextStepId && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={handleDialogAdvance}
                      className="flex-1"
                    >
                      <span>Étape suivante · {statusLabel(nextStepId)}</span>
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Button>
                  )}

                  {activeItem.status !== "a_publier" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={handleDialogBack}
                    >
                      <ArrowLeft aria-hidden="true" className="size-3.5" />
                      <span>Revenir en arrière</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Champs de l'article */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="f-title">Titre de l&apos;article *</Label>
                <span className="text-xs text-muted-foreground">
                  {form.title.length} / 100 car.
                </span>
              </div>
              <Input
                id="f-title"
                name="title"
                required
                maxLength={100}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex. Veste Will en jean brut bio"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-brand">Marque</Label>
                <Input
                  id="f-brand"
                  name="brand"
                  maxLength={60}
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="Ex. Sézane"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-size">Taille</Label>
                <Input
                  id="f-size"
                  name="size"
                  maxLength={20}
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  placeholder="Ex. M / 38"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-condition">État</Label>
                <select
                  id="f-condition"
                  name="condition"
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Non précisé</option>
                  {CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prix en euros + Marge en direct */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-purchasePrice">Prix d&apos;achat (€)</Label>
                <Input
                  id="f-purchasePrice"
                  name="purchasePrice"
                  inputMode="decimal"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  placeholder="Ex. 12,50"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-listingPrice">Prix affiché (€)</Label>
                <Input
                  id="f-listingPrice"
                  name="listingPrice"
                  inputMode="decimal"
                  value={form.listingPrice}
                  onChange={(e) => setForm({ ...form, listingPrice: e.target.value })}
                  placeholder="Ex. 25,00"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-salePrice">Prix de vente (€)</Label>
                <Input
                  id="f-salePrice"
                  name="salePrice"
                  inputMode="decimal"
                  value={form.salePrice}
                  onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                  placeholder="Ex. 22,00"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Marge nette (prix de vente − prix d&apos;achat, 0 € de frais vendeur) :
              </span>
              <strong
                className={`font-mono text-sm ${
                  liveMarginCents === null
                    ? "text-muted-foreground"
                    : liveMarginCents < 0
                      ? "text-destructive"
                      : "text-success"
                }`}
              >
                {liveMarginCents !== null
                  ? `${liveMarginCents >= 0 ? "+ " : ""}${formatPrice(liveMarginCents)}`
                  : "—"}
              </strong>
            </div>

            {/* Acheteur, Transporteur & Suivi */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-buyer">Pseudo de l&apos;acheteur</Label>
                <Input
                  id="f-buyer"
                  name="buyer"
                  maxLength={60}
                  value={form.buyer}
                  onChange={(e) => setForm({ ...form, buyer: e.target.value })}
                  placeholder="Ex. @claire_vintage75"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="f-carrier">Transporteur</Label>
                  <span className="text-xs text-muted-foreground">
                    Requis pour expédier
                  </span>
                </div>
                <select
                  id="f-carrier"
                  name="carrier"
                  value={form.carrier}
                  onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Non choisi</option>
                  {CARRIERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="f-trackingNumber">Numéro de suivi</Label>
                <span className="text-xs text-muted-foreground">Facultatif</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="f-trackingNumber"
                  name="trackingNumber"
                  maxLength={60}
                  value={form.trackingNumber}
                  onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
                  placeholder="Ex. MR-884920194-FR"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!form.trackingNumber.trim()}
                  onClick={handleCopyTracking}
                >
                  <Copy aria-hidden="true" className="size-3.5" />
                  <span>{copied ? "Copié ✓" : "Copier"}</span>
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="f-notes">Note libre</Label>
                <span className="text-xs text-muted-foreground">
                  {form.notes.length} / 1 000 car.
                </span>
              </div>
              <Textarea
                id="f-notes"
                name="notes"
                maxLength={1000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Détails du colis, point relais, remarques…"
              />
            </div>

            {/* Pied de la fiche : Annuler la vente, Supprimer, Enregistrer */}
            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              {dialogMode === "edit" && activeItem ? (
                <div className="flex flex-wrap items-center gap-2">
                  {["vendu", "expedie", "livre"].includes(activeItem.status) && (
                    <Button
                      type="button"
                      variant={confirmCancel ? "destructive" : "outline"}
                      size="sm"
                      disabled={isPending}
                      onClick={handleDialogCancelSale}
                    >
                      <RotateCcw aria-hidden="true" className="size-3.5" />
                      <span>
                        {confirmCancel ? "Confirmer l'annulation" : "Annuler la vente"}
                      </span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={handleDialogDelete}
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                    <span>
                      {confirmDelete ? "Confirmer la suppression" : "Supprimer"}
                    </span>
                  </Button>
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={closeDialog}
                >
                  Fermer
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
