import { Download } from "lucide-react";
import { formatDriveDate, formatSize } from "@/lib/drive";

export type PublicResource = {
  id: string;
  name: string;
  size_bytes: number;
  updated_at: string;
};

/** Fichiers publics du Drive, sur le profil public. Rien ne s'affiche s'il n'y en a pas. */
export function ResourcesSection({ username, items }: { username: string; items: PublicResource[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="resources-title" className="space-y-4">
      <h2 id="resources-title" className="font-heading text-2xl font-normal tracking-tight">
        Ressources
      </h2>
      <ul className="divide-y rounded-xl border bg-card">
        {items.map((item) => (
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
