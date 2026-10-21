import {
  Calendar,
  FileText,
  FolderOpen,
  LayoutGrid,
  User,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MODULES } from "./modules";

const MODULE_ICONS = {
  cv: FileText,
  rdv: Calendar,
  boards: LayoutGrid,
  fichiers: FolderOpen,
  visio: Video,
} as const;

export function Sidebar() {
  return (
    <nav
      aria-label="Modules"
      className="w-60 shrink-0 space-y-6 border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground"
    >
      <ul>
        <li>
          <span
            aria-current="page"
            className="flex items-center gap-3 border-l-[3px] border-primary bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground"
          >
            <User aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
            Profil public
          </span>
        </li>
      </ul>
      <div className="space-y-2">
        <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Bientôt
        </p>
        <ul className="space-y-1">
          {MODULES.map((m) => {
            const Icon = MODULE_ICONS[m.id];
            return (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground"
              >
                <span className="flex items-center gap-3">
                  <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>{m.label}</span>
                </span>
                <Badge variant="secondary">Bientôt</Badge>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
