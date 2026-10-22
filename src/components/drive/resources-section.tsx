import Link from "next/link";
import { Download } from "lucide-react";
import { FILE_CATEGORIES, categoryOf, formatDriveDate, formatSize, type FileCategory } from "@/lib/drive";
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
 * Fichiers publics du Drive, sur le profil public. Rien ne s'affiche s'il n'y en a pas.
 * Avec `filterHref`, un petit menu (Tous, Documents, Images, Autres) filtre par type, dès qu'il y a au
 * moins deux types de fichiers.
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
  if (items.length === 0) return null;
  const present = FILE_CATEGORIES.filter((c) => items.some((i) => categoryOf(i.mime_type, i.name) === c.id));
  const showFilter = Boolean(filterHref) && present.length >= 2;
  const active = present.some((c) => c.id === filter) ? filter : "tous";
  const shown = active === "tous" ? items : items.filter((i) => categoryOf(i.mime_type, i.name) === active);

  return (
    <section aria-labelledby="resources-title" className="space-y-4">
      <h2 id="resources-title" className="font-heading text-2xl font-normal tracking-tight">
        Ressources
      </h2>
      {showFilter && filterHref && (
        <nav aria-label="Filtrer les ressources" className="flex flex-wrap gap-4 text-sm">
          {[{ id: "tous" as const, label: "Tous" }, ...present].map((c) => (
            <Link
              key={c.id}
              href={filterHref(c.id)}
              aria-current={active === c.id ? "true" : undefined}
              className={cn(
                "border-b-2 pb-0.5",
                active === c.id
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label}
            </Link>
          ))}
        </nav>
      )}
      <ul className="divide-y rounded-xl border bg-card">
        {shown.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(item.size_bytes)} · {formatDriveDate(item.updated_at)}
              </p>
            </div>
            <a
              href={`/${encodeURIComponent(username)}/ressources/${item.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm hover:bg-muted"
              aria-label={`Télécharger ${item.name}`}
            >
              <Download aria-hidden="true" className="size-4" />
              Télécharger
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
