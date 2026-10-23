"use client";

import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Copy,
  Plus,
  Search,
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
  moveFor,
  nextStatus,
  parsePrice,
  shipDeadline,
  stats,
  type Carrier,
  type Condition,
  type Status,
  type VintedItem,
} from "@/lib/vinted";
import { Alert } from "@/components/ui/alert";
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

const NETWORK_ERROR = "La connexion a été interrompue. Réessaie dans un instant.";

const COLUMN_SUBTITLES: Record<Status, string> = {
  a_publier: "En stock, pas encore publié",
  en_vente: "Publiés sur Vinted",
  vendu: "5 jours ouvrés max.",
  expedie: "Colis confiés au transporteur",
  livre: "2 jours pour l'acheteur",
  termine: "Argent reçu",
};

const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

function formatShortDate(value: string | Date): string {
  return shortDateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

function centsToInput(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

function statusLabel(status: Status): string {
  return STATUSES.find((s) => s.id === status)?.label ?? status;
}

function conditionLabel(condition: Condition | null): string | null {
  if (!condition) return null;
  return CONDITIONS.find((c) => c.id === condition)?.label ?? null;
}

function carrierLabel(carrier: Carrier | null): string | null {
  if (!carrier) return null;
  return CARRIERS.find((c) => c.id === carrier)?.label ?? null;
}

function badgeVariantForStatus(
  status: Status,
): "default" | "secondary" | "destructive" | "success" | "accent" | "outline" {
  if (status === "vendu") return "accent";
  if (status === "livre" || status === "termine") return "success";
  return "secondary";
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

function deadlineSummary(
  item: VintedItem,
  nowDate: Date,
): { text: string; late: boolean; payout: boolean } {
  switch (item.status) {
    case "vendu": {
      const deadline = shipDeadline(item);
      const late = isLate(item, nowDate);
      const formatted = deadline ? formatShortDate(deadline) : "—";
      return {
        text: late
          ? `En retard · À expédier avant le ${formatted}`
          : `À expédier avant le ${formatted}`,
        late,
        payout: false,
      };
    }
    case "livre": {
      const available = moneyAvailableOn(item);
      return {
        text: available ? `Argent dispo vers le ${formatShortDate(available)}` : "Livré",
        late: false,
        payout: true,
      };
    }
    case "expedie": {
      const cLabel = carrierLabel(item.carrier);
      const tracking = item.trackingNumber ? `Suivi : ${item.trackingNumber}` : "Suivi : —";
      return {
        text: cLabel ? `${tracking} · ${cLabel}` : tracking,
        late: false,
        payout: false,
      };
    }
    case "en_vente": {
      const d = item.listedAt ?? item.createdAt;
      return {
        text: `Mis en ligne le ${formatShortDate(d)}`,
        late: false,
        payout: false,
      };
    }
    case "a_publier":
      return { text: "En stock", late: false, payout: false };
    case "termine": {
      const d = item.completedAt;
      return {
        text: d ? `Argent reçu le ${formatShortDate(d)}` : "Argent reçu",
        late: false,
        payout: false,
      };
    }
  }
}

type DrawerMode =
  | { type: "Closed" }
  | { type: "Create" }
  | { type: "Edit"; itemId: string };

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
  const [optimisticItems, applyOptimistic] = useOptimistic(
    items,
    (current: VintedItem[], update: { id: string; status: Status }) =>
      current.map((it) => (it.id === update.id ? { ...it, status: update.status } : it)),
  );

  const nowDate = new Date(now);
  const activeStageObj = STATUSES.find((s) => s.slug === stage) ?? null;

  const [query, setQuery] = useState("");
  const [mobileStatus, setMobileStatus] = useState<Status>(
    activeStageObj?.id ?? "a_publier",
  );
  const [boardError, setBoardError] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>({ type: "Closed" });
  const [activeDragItem, setActiveDragItem] = useState<VintedItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const kpi = stats(optimisticItems, nowDate);
  const counts = countsByStatus(optimisticItems);
  const filtered = filterItems(optimisticItems, null, query);

  const visibleStatuses = activeStageObj ? [activeStageObj] : STATUSES;
  const inTimeToShip = Math.max(0, kpi.toShip.count - kpi.toShip.late);

  const selectedItem =
    drawerMode.type === "Edit"
      ? optimisticItems.find((it) => it.id === drawerMode.itemId) ?? null
      : null;

  const isDrawerOpen =
    drawerMode.type === "Create" || (drawerMode.type === "Edit" && selectedItem !== null);

  function openCreateDrawer() {
    setBoardError(null);
    setDrawerError(null);
    setDrawerMode({ type: "Create" });
  }

  function openEditDrawer(item: VintedItem, initialError: string | null = null) {
    setBoardError(null);
    setDrawerError(initialError);
    setDrawerMode({ type: "Edit", itemId: item.id });
  }

  function closeDrawer() {
    setDrawerError(null);
    setDrawerMode({ type: "Closed" });
  }

  function handleAdvanceFromBoard(item: VintedItem) {
    setBoardError(null);
    const reason = canAdvance(item);
    if (reason) {
      openEditDrawer(item, reason);
      return;
    }
    const target = nextStatus(item.status);
    if (!target) return;

    startTransition(async () => {
      applyOptimistic({ id: item.id, status: target });
      try {
        const res: VintedActionResult = await advanceItem(item.id);
        if (res.error) {
          setBoardError(res.error);
          return;
        }
        router.refresh();
      } catch {
        setBoardError(NETWORK_ERROR);
      }
    });
  }

  function handleBackFromBoard(item: VintedItem, target: Status) {
    setBoardError(null);
    startTransition(async () => {
      applyOptimistic({ id: item.id, status: target });
      try {
        const res: VintedActionResult = await backItem(item.id);
        if (res.error) {
          setBoardError(res.error);
          return;
        }
        router.refresh();
      } catch {
        setBoardError(NETWORK_ERROR);
      }
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const item = event.active.data.current?.item as VintedItem | undefined;
    if (item) setActiveDragItem(item);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragItem(null);
    const item = event.active.data.current?.item as VintedItem | undefined;
    const overId = event.over?.id as Status | undefined;
    if (!item || !overId) return;

    const move = moveFor(item.status, overId);
    if (move === "same") return;
    if (move === null) {
      setBoardError("Déplace l'article d'une seule étape à la fois.");
      return;
    }
    if (move === "advance") {
      handleAdvanceFromBoard(item);
      return;
    }
    if (move === "back") {
      handleBackFromBoard(item, overId);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* En-tête */}
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            ESPACE PRIVÉ · TABLEAU PAR ÉTAPES
          </p>
          <h1 className="mt-1 font-heading text-2xl font-normal tracking-tight text-foreground sm:text-4xl">
            Mes ventes Vinted
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fais glisser tes articles d&apos;une colonne à l&apos;autre au fil de tes expéditions et encaissements.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" onClick={openCreateDrawer} disabled={isPending}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Ajouter un article</span>
          </Button>
        </div>
      </header>

      {/* Les 4 chiffres en haut */}
      <section
        aria-label="Indicateurs du mois"
        className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-4"
      >
        <article className="flex min-w-0 flex-col justify-between gap-1.5 border-b border-r border-border p-3.5 lg:border-b-0 lg:p-4">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              En vente
            </span>
          </div>
          <p className="font-heading text-xl font-medium text-foreground sm:text-2xl">
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
          className={`flex min-w-0 flex-col justify-between gap-1.5 border-b border-border p-3.5 lg:border-b-0 lg:border-r lg:p-4 ${
            kpi.toShip.late > 0 ? "bg-accent/30" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              À expédier
            </span>
            {kpi.toShip.late > 0 && (
              <Badge variant="destructive">dont {kpi.toShip.late} en retard</Badge>
            )}
          </div>
          <p className="font-heading text-xl font-medium text-foreground sm:text-2xl">
            {kpi.toShip.count} colis
          </p>
          <p className="text-xs text-muted-foreground">
            {inTimeToShip} dans les délais · {kpi.toShip.late} à déposer vite
          </p>
        </article>

        <article className="flex min-w-0 flex-col justify-between gap-1.5 border-r border-border p-3.5 lg:p-4">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ventes du mois
            </span>
          </div>
          <p className="font-heading font-mono text-xl font-medium text-foreground sm:text-2xl">
            {formatPrice(kpi.monthSales.totalCents)}
          </p>
          <p className="text-xs text-muted-foreground">
            <strong className="font-mono font-medium text-foreground">
              {kpi.monthSales.count} {kpi.monthSales.count > 1 ? "ventes" : "vente"}
            </strong>{" "}
            · En attente :{" "}
            <span className="font-mono text-foreground">{formatPrice(kpi.pendingCents)}</span>
          </p>
        </article>

        <article className="flex min-w-0 flex-col justify-between gap-1.5 p-3.5 lg:p-4">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Marge du mois
            </span>
          </div>
          <p className="font-heading font-mono text-xl font-medium text-success sm:text-2xl">
            {kpi.monthMarginCents >= 0
              ? `+ ${formatPrice(kpi.monthMarginCents)}`
              : formatPrice(kpi.monthMarginCents)}
          </p>
          <p className="text-xs text-muted-foreground">
            Sur les ventes avec prix d&apos;achat
          </p>
        </article>
      </section>

      {/* Barre d'onglets, sélecteur mobile et recherche */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:p-4">
        <nav aria-label="Filtrer par étape" className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/dashboard/vinted"
            aria-current={activeStageObj === null ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              activeStageObj === null
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span>Tous</span>
            <span
              className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] ${
                activeStageObj === null
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {optimisticItems.length}
            </span>
          </Link>

          {STATUSES.map((s) => {
            const isActive = activeStageObj?.id === s.id;
            return (
              <Link
                key={s.id}
                href={`/dashboard/vinted?etape=${s.slug}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setMobileStatus(s.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span>{s.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] ${
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

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Sélecteur mobile (< md) */}
          <div className="md:hidden">
            <Label htmlFor="mobile-stage-select" className="sr-only">
              Étape affichée
            </Label>
            <select
              id="mobile-stage-select"
              value={activeStageObj?.id ?? mobileStatus}
              onChange={(e) => {
                const next = e.target.value as Status;
                setMobileStatus(next);
                if (activeStageObj) {
                  const found = STATUSES.find((s) => s.id === next);
                  if (found) router.push(`/dashboard/vinted?etape=${found.slug}`);
                }
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {STATUSES.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  {idx + 1}. {s.label} ({counts[s.id]})
                </option>
              ))}
            </select>
          </div>

          <div className="relative max-w-md flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par titre ou marque…"
              aria-label="Rechercher par titre ou marque"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {boardError && <Alert variant="destructive">{boardError}</Alert>}

      {/* Écran vide ou Tableau par étapes */}
      {optimisticItems.length === 0 ? (
        <section
          aria-label="Aucun article"
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-12 text-center"
        >
          <p className="font-heading text-lg text-foreground">
            Aucun article pour l&apos;instant. Ajoute ton premier article.
          </p>
          <Button type="button" onClick={openCreateDrawer}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Ajouter un article</span>
          </Button>
        </section>
      ) : (
        <section
          aria-label="Tableau par étapes"
          className="w-full min-w-0 overflow-x-hidden md:overflow-x-auto md:pb-3"
        >
          <DndContext
            id="vinted-board"
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragCancel={() => setActiveDragItem(null)}
            onDragEnd={handleDragEnd}
            accessibility={{
              screenReaderInstructions: {
                draggable:
                  "Appuie sur Espace pour attraper. Utilise les flèches pour déplacer. Appuie sur Espace pour poser, ou sur Échap pour annuler.",
              },
              announcements: {
                onDragStart: () =>
                  "Article attrapé. Utilise les flèches pour le déplacer.",
                onDragOver: ({ over }) =>
                  over
                    ? "Nouvelle colonne sélectionnée."
                    : "Aucune colonne sélectionnée.",
                onDragEnd: () => "Article posé.",
                onDragCancel: () => "Déplacement annulé.",
              },
            }}
          >
            <div className="block w-full min-w-0 md:flex md:w-max md:min-w-full md:items-start md:gap-3.5">
              {visibleStatuses.map((statusObj) => {
                const stepNumber = STATUSES.findIndex((s) => s.id === statusObj.id) + 1;
                const columnItems = filtered.filter((it) => it.status === statusObj.id);
                const columnTotalCents = columnItems.reduce(
                  (acc, it) => acc + (it.salePriceCents ?? it.listingPriceCents ?? 0),
                  0,
                );
                const isMobileVisible =
                  activeStageObj !== null || statusObj.id === mobileStatus;

                return (
                  <StageColumn
                    key={statusObj.id}
                    status={statusObj.id}
                    label={statusObj.label}
                    stepNumber={stepNumber}
                    subtitle={COLUMN_SUBTITLES[statusObj.id]}
                    totalCents={columnTotalCents}
                    items={columnItems}
                    nowDate={nowDate}
                    isMobileVisible={isMobileVisible}
                    selectedItemId={selectedItem?.id ?? null}
                    isPending={isPending}
                    onSelectItem={(it) => openEditDrawer(it)}
                    onAdvanceItem={handleAdvanceFromBoard}
                  />
                );
              })}
            </div>

            <DragOverlay>
              {activeDragItem ? (
                <div className="w-72 rounded-lg border-2 border-primary bg-card p-3 shadow-lg">
                  <p className="font-heading text-sm font-medium text-foreground">
                    {activeDragItem.title}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {formatPrice(
                      activeDragItem.salePriceCents ??
                        activeDragItem.listingPriceCents ??
                        0,
                    )}
                  </p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>
      )}

      {/* Panneau latéral droit (Fiche article / Création) */}
      <Dialog
        open={isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
      >
        <DialogContent className="fixed inset-y-0 right-0 left-0 top-0 z-50 flex h-full max-h-screen w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-y-auto rounded-none border-l border-border bg-card p-0 shadow-xl sm:left-auto sm:max-w-md">
          {drawerMode.type === "Create" ? (
            <ArticleDrawerForm
              key="create"
              item={null}
              nowDate={nowDate}
              error={drawerError}
              isPending={isPending}
              onError={setDrawerError}
              onClose={closeDrawer}
              onSuccess={() => {
                closeDrawer();
                router.refresh();
              }}
              startTransition={startTransition}
            />
          ) : selectedItem ? (
            <ArticleDrawerForm
              key={`${selectedItem.id}-${selectedItem.updatedAt}-${selectedItem.status}`}
              item={selectedItem}
              nowDate={nowDate}
              error={drawerError}
              isPending={isPending}
              onError={setDrawerError}
              onClose={closeDrawer}
              onSuccess={() => {
                closeDrawer();
                router.refresh();
              }}
              startTransition={startTransition}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StageColumn({
  status,
  label,
  stepNumber,
  subtitle,
  totalCents,
  items,
  nowDate,
  isMobileVisible,
  selectedItemId,
  isPending,
  onSelectItem,
  onAdvanceItem,
}: {
  status: Status;
  label: string;
  stepNumber: number;
  subtitle: string;
  totalCents: number;
  items: VintedItem[];
  nowDate: Date;
  isMobileVisible: boolean;
  selectedItemId: string | null;
  isPending: boolean;
  onSelectItem: (item: VintedItem) => void;
  onAdvanceItem: (item: VintedItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
  });

  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={`${
        isMobileVisible ? "flex" : "hidden md:flex"
      } w-full min-w-0 flex-col rounded-lg border bg-secondary/50 transition-colors md:w-72 md:shrink-0 ${
        status === "vendu" ? "border-t-4 border-t-primary" : ""
      } ${isOver ? "border-primary bg-accent/40 ring-2 ring-primary" : "border-border"}`}
    >
      <header className="flex flex-col gap-1 rounded-t-lg border-b border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 font-heading text-base font-medium text-foreground">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-secondary font-mono text-xs text-muted-foreground">
              {stepNumber}
            </span>
            <span>{label}</span>
          </h2>
          <span className="rounded-full border border-border bg-secondary px-2 py-0.5 font-mono text-xs font-semibold text-secondary-foreground">
            {items.length}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{subtitle}</span>
          <span className="font-mono font-medium text-foreground">
            {formatPrice(totalCents)}
          </span>
        </div>
      </header>

      <div className="flex min-h-36 flex-1 flex-col gap-2.5 p-2.5">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            Aucun article
          </div>
        ) : (
          items.map((item) => (
            <ArticleCard
              key={item.id}
              item={item}
              nowDate={nowDate}
              isSelected={selectedItemId === item.id}
              isPending={isPending}
              onSelect={() => onSelectItem(item)}
              onAdvance={() => onAdvanceItem(item)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function ArticleCard({
  item,
  nowDate,
  isSelected,
  isPending,
  onSelect,
  onAdvance,
}: {
  item: VintedItem;
  nowDate: Date;
  isSelected: boolean;
  isPending: boolean;
  onSelect: () => void;
  onAdvance: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  const displayPriceCents = item.salePriceCents ?? item.listingPriceCents;
  const metaParts = [item.brand, item.size, conditionLabel(item.condition)].filter(
    Boolean,
  );
  const deadline = deadlineSummary(item, nowDate);

  const hasMargin = item.purchasePriceCents !== null && item.salePriceCents !== null;
  const marginCents = hasMargin
    ? (item.salePriceCents ?? 0) - (item.purchasePriceCents ?? 0)
    : null;

  return (
    <article
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex min-w-0 cursor-grab flex-col gap-2 rounded-md border bg-card p-3 shadow-xs transition-all active:cursor-grabbing ${
        deadline.late ? "border-l-4 border-l-primary" : ""
      } ${
        isSelected
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-muted-foreground"
      } ${isDragging ? "opacity-45" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 font-heading text-base font-medium leading-snug text-foreground">
          <button
            type="button"
            onClick={onSelect}
            className="w-full cursor-pointer text-left break-words hover:text-primary focus-visible:underline focus-visible:outline-none"
          >
            {item.title}
          </button>
        </h3>
        {displayPriceCents !== null && (
          <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
            {formatPrice(displayPriceCents)}
          </span>
        )}
      </div>

      {metaParts.length > 0 && (
        <p className="text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
      )}

      {(item.buyer || marginCents !== null || item.purchasePriceCents !== null) && (
        <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
          <span>
            {item.buyer ? (
              <>
                Acheteur : <strong className="text-foreground">{item.buyer}</strong>
              </>
            ) : null}
          </span>
          {marginCents !== null ? (
            <span className="font-mono font-medium text-success">
              Marge {marginCents >= 0 ? "+" : ""}
              {formatPrice(marginCents)}
            </span>
          ) : item.purchasePriceCents !== null ? (
            <span className="font-mono">
              Achat {formatPrice(item.purchasePriceCents)}
            </span>
          ) : null}
        </div>
      )}

      <div
        className={`flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs ${
          deadline.late
            ? "bg-destructive/10 font-semibold text-destructive"
            : deadline.payout
              ? "bg-accent/50 font-medium text-foreground"
              : "bg-secondary text-muted-foreground"
        }`}
      >
        {deadline.late ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : item.status === "vendu" ? (
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : null}
        <span>{deadline.text}</span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-dashed border-border pt-2">
        <Badge variant={badgeVariantForStatus(item.status)}>
          {statusLabel(item.status)}
        </Badge>
        {item.status !== "termine" && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={onAdvance}
            className="h-7 px-2 text-xs"
          >
            Étape suivante →
          </Button>
        )}
      </div>
    </article>
  );
}

function ArticleDrawerForm({
  item,
  nowDate,
  error,
  isPending,
  onError,
  onClose,
  onSuccess,
  startTransition,
}: {
  item: VintedItem | null;
  nowDate: Date;
  error: string | null;
  isPending: boolean;
  onError: (msg: string | null) => void;
  onClose: () => void;
  onSuccess: () => void;
  startTransition: (callback: () => Promise<void>) => void;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [size, setSize] = useState(item?.size ?? "");
  const [condition, setCondition] = useState<string>(item?.condition ?? "");
  const [purchasePrice, setPurchasePrice] = useState(
    centsToInput(item?.purchasePriceCents ?? null),
  );
  const [listingPrice, setListingPrice] = useState(
    centsToInput(item?.listingPriceCents ?? null),
  );
  const [salePrice, setSalePrice] = useState(
    centsToInput(item?.salePriceCents ?? null),
  );
  const [buyer, setBuyer] = useState(item?.buyer ?? "");
  const [carrier, setCarrier] = useState<string>(item?.carrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(item?.trackingNumber ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");

  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("brand", brand);
    fd.set("size", size);
    fd.set("condition", condition);
    fd.set("purchasePrice", purchasePrice);
    fd.set("listingPrice", listingPrice);
    fd.set("salePrice", salePrice);
    fd.set("buyer", buyer);
    fd.set("carrier", carrier);
    fd.set("trackingNumber", trackingNumber);
    fd.set("notes", notes);
    fd.set("status", item?.status ?? "a_publier");
    return fd;
  }

  let liveMarginLabel = "—";
  try {
    const buyCents = parsePrice(purchasePrice);
    const sellCents = parsePrice(salePrice);
    if (buyCents !== null && sellCents !== null) {
      const diff = sellCents - buyCents;
      liveMarginLabel = `${diff >= 0 ? "+" : ""}${formatPrice(diff)}`;
    }
  } catch {
    liveMarginLabel = "Prix invalide";
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    const fd = buildFormData();

    startTransition(async () => {
      try {
        const res: VintedActionResult = item
          ? await updateItem(item.id, fd)
          : await createItem(fd);
        if (res.error) {
          onError(res.error);
          return;
        }
        onSuccess();
      } catch {
        onError(NETWORK_ERROR);
      }
    });
  }

  function handleSaveAndAdvance() {
    if (!item) return;
    onError(null);
    const fd = buildFormData();

    startTransition(async () => {
      try {
        const updateRes: VintedActionResult = await updateItem(item.id, fd);
        if (updateRes.error) {
          onError(updateRes.error);
          return;
        }
        const advRes: VintedActionResult = await advanceItem(item.id);
        if (advRes.error) {
          onError(advRes.error);
          return;
        }
        onSuccess();
      } catch {
        onError(NETWORK_ERROR);
      }
    });
  }

  function handleBack() {
    if (!item) return;
    onError(null);
    startTransition(async () => {
      try {
        const res: VintedActionResult = await backItem(item.id);
        if (res.error) {
          onError(res.error);
          return;
        }
        onSuccess();
      } catch {
        onError(NETWORK_ERROR);
      }
    });
  }

  function handleCancelSale() {
    if (!item) return;
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    onError(null);
    startTransition(async () => {
      try {
        const res: VintedActionResult = await cancelSale(item.id);
        if (res.error) {
          onError(res.error);
          return;
        }
        onSuccess();
      } catch {
        onError(NETWORK_ERROR);
      }
    });
  }

  function handleDelete() {
    if (!item) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onError(null);
    startTransition(async () => {
      try {
        const res: VintedActionResult = await deleteItem(item.id);
        if (res.error) {
          onError(res.error);
          return;
        }
        onSuccess();
      } catch {
        onError(NETWORK_ERROR);
      }
    });
  }

  async function handleCopyTracking() {
    if (!trackingNumber.trim() || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(trackingNumber.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible
    }
  }

  const nextId = item ? nextStatus(item.status) : null;
  const nextLabel = nextId ? statusLabel(nextId) : null;
  const currentStepIdx = item
    ? STATUSES.findIndex((s) => s.id === item.status)
    : -1;
  const deadline = item ? deadlineSummary(item, nowDate) : null;
  const canCancelSale =
    item !== null && ["vendu", "expedie", "livre"].includes(item.status);

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <DialogHeader className="border-b border-border bg-card p-4 text-left sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          FICHE ARTICLE
        </p>
        <DialogTitle className="mt-1 font-heading text-xl font-medium text-foreground">
          {item ? item.title : "Nouvel article"}
        </DialogTitle>
        <DialogDescription className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {item && deadline ? (
              <>
                <Badge variant={badgeVariantForStatus(item.status)}>
                  {statusLabel(item.status)}
                </Badge>
                <span
                  className={
                    deadline.late ? "font-semibold text-destructive" : "text-foreground"
                  }
                >
                  {deadline.text}
                </span>
              </>
            ) : (
              <span>Renseigne les détails de ton article Vinted.</span>
            )}
          </DialogDescription>
      </DialogHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:px-5">
        {error && <Alert variant="destructive">{error}</Alert>}

        {/* Frise des 6 étapes (uniquement en édition) */}
        {item && (
          <div
            aria-label="Progression des 6 étapes"
            className="flex flex-col gap-3 rounded-md border border-border bg-secondary p-3"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                Parcours (étape {currentStepIdx + 1} sur 6)
              </span>
              <span className="text-muted-foreground">Dates automatiques</span>
            </div>

            <ol className="grid grid-cols-3 gap-1.5">
              {STATUSES.map((s, idx) => {
                const isCurrent = s.id === item.status;
                const isDone = idx < currentStepIdx;
                const rawDate = stepDateForStatus(item, s.id);
                return (
                  <li
                    key={s.id}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex min-w-0 flex-col gap-0.5 rounded-sm border p-2 text-xs ${
                      isCurrent
                        ? "border-primary bg-accent text-accent-foreground ring-1 ring-primary"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    <span className="flex items-center justify-between font-mono text-[11px] font-semibold">
                      <span>{idx + 1}</span>
                      <span>{isDone ? "✓" : isCurrent ? "●" : ""}</span>
                    </span>
                    <span className="truncate font-semibold">{s.label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {rawDate ? formatShortDate(rawDate) : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="flex flex-wrap items-center gap-2">
              {nextLabel && (
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={handleSaveAndAdvance}
                  className="flex-1"
                >
                  <span>Étape suivante · {nextLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              )}
              {item.status !== "a_publier" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Revenir en arrière</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Champs du formulaire */}
        <input type="hidden" name="status" value={item?.status ?? "a_publier"} />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="f-title">Titre de l&apos;article *</Label>
            <span className="font-mono text-xs text-muted-foreground">
              {title.length}/100
            </span>
          </div>
          <Input
            id="f-title"
            name="title"
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-brand">Marque</Label>
            <Input
              id="f-brand"
              name="brand"
              maxLength={60}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-size">Taille</Label>
            <Input
              id="f-size"
              name="size"
              maxLength={20}
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-condition">État</Label>
            <select
              id="f-condition"
              name="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-purchasePrice">Prix d&apos;achat (€)</Label>
            <Input
              id="f-purchasePrice"
              name="purchasePrice"
              inputMode="decimal"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-listingPrice">Prix affiché (€)</Label>
            <Input
              id="f-listingPrice"
              name="listingPrice"
              inputMode="decimal"
              value={listingPrice}
              onChange={(e) => setListingPrice(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-salePrice">Prix de vente (€)</Label>
            <Input
              id="f-salePrice"
              name="salePrice"
              inputMode="decimal"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border bg-secondary px-3 py-2 text-xs">
          <span className="text-muted-foreground">Marge nette :</span>
          <strong className="font-mono text-sm text-success">{liveMarginLabel}</strong>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-buyer">Pseudo de l&apos;acheteur</Label>
            <Input
              id="f-buyer"
              name="buyer"
              maxLength={60}
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-1">
              <Label htmlFor="f-carrier">Transporteur</Label>
              <span className="text-[11px] text-muted-foreground">
                Obligatoire pour expédier
              </span>
            </div>
            <select
              id="f-carrier"
              name="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-trackingNumber">Numéro de suivi</Label>
          <div className="flex items-center gap-2">
            <Input
              id="f-trackingNumber"
              name="trackingNumber"
              maxLength={60}
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="flex-1 font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyTracking}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copié ✓</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copier</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="f-notes">Notes</Label>
            <span className="font-mono text-xs text-muted-foreground">
              {notes.length}/1 000
            </span>
          </div>
          <Textarea
            id="f-notes"
            name="notes"
            maxLength={1000}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Pied de fiche */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border bg-secondary p-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          {canCancelSale && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleCancelSale}
            >
              {confirmCancel ? "Confirmer l'annulation" : "Annuler la vente"}
            </Button>
          )}
          {item && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleDelete}
            >
              {confirmDelete ? "Confirmer la suppression" : "Supprimer"}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={onClose}
          >
            Fermer
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            Enregistrer
          </Button>
        </div>
      </div>
    </form>
  );
}
