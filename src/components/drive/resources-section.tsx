import Link from "next/link";
import { Download, File } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  FILE_CATEGORIES,
  categoryOf,
  extensionOf,
  formatDriveDate,
  formatSize,
  type FileCategory,
} from "@/lib/drive";
import { cn } from "@/lib/utils";

export type PublicResource = {
  id: string;
  name: string;
  size_bytes: number;
  updated_at: string;
  mime_type?: string | null;
};

export type ResourceFilter = FileCategory | "tous";

export function parseResourceFilter(raw: string | undefined): ResourceFilter {
  return FILE_CATEGORIES.some((c) => c.id === raw) ? (raw as FileCategory) : "tous";
}

/**
 * Fichiers publics du Drive, sur le profil public (liste éditoriale sobre).
 * Avec `filterHref`, des pastilles (Tous, Documents, Images, Autres) filtrent par type dès qu'au
 * moins deux catégories sont présentes.
 */
export function ResourcesSection({
  username,
  items,
  filter = "tous",
  filterHref,
}: {
  username: string;
  items: PublicResource[];
  filter?: ResourceFilter;
  filterHref?: (filter: ResourceFilter) => string;
}) {
  const present = FILE_CATEGORIES.filter((c) => items.some((i) => categoryOf(i.mime_type, i.name) === c.id));
  const showFilter = Boolean(filterHref) && present.length >= 2;
  const active = present.some((c) => c.id === filter) ? filter : "tous";
  const shown = active === "tous" ? items : items.filter((i) => categoryOf(i.mime_type, i.name) === active);

  return (
    <section aria-labelledby="resources-title" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="resources-title" className="font-heading text-2xl font-normal tracking-tight">
            Documents en libre accès
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ressources publiques mises à disposition pour consultation et téléchargement.
          </p>
        </div>
        {showFilter && filterHref && (
          <nav aria-label="Filtrer les ressources" className="flex flex-wrap gap-1.5">
            {[{ id: "tous" as const, label: "Tous" }, ...present].map((c) => (
              <Link
                key={c.id}
                href={filterHref(c.id)}
                aria-current={active === c.id ? "true" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  active === c.id
                    ? "border-transparent bg-accent font-medium text-accent-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {c.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card px-5 py-11 text-center text-muted-foreground">
          <div
            aria-hidden="true"
            className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <File aria-hidden="true" className="size-4" />
          </div>
          <p className="text-sm text-foreground">Aucun fichier à télécharger pour le moment.</p>
        </div>
      )}

      {shown.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card text-card-foreground">
          <div className="hidden border-b bg-secondary px-5 py-2.5 text-[0.7rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:grid sm:grid-cols-[1fr_auto] sm:items-center">
            <span>Fichier &amp; informations</span>
            <span>Action</span>
          </div>
          <ul className="divide-y">
            {shown.map((item) => {
              const ext = extensionOf(item.name).toUpperCase();
              const meta = [ext, formatSize(item.size_bytes), formatDriveDate(item.updated_at)]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 p-4 transition-colors hover:bg-secondary sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:py-3.5"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center">
                    <Badge
                      variant="secondary"
                      className="h-auto min-w-[3.1rem] rounded-sm border-border px-2 py-1 font-mono text-[0.6875rem] font-semibold tracking-wider"
                    >
                      {ext || "FICHIER"}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9375rem] leading-snug font-medium wrap-break-word text-foreground">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
                    </div>
                  </div>
                  <a
                    href={`/${encodeURIComponent(username)}/ressources/${item.id}`}
                    className={cn(buttonVariants({ variant: "default" }), "h-auto px-3.5 py-2 text-xs")}
                    aria-label={`Télécharger ${item.name}`}
                  >
                    <Download aria-hidden="true" className="size-4" />
                    Télécharger
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
