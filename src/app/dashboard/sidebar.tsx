import { Badge } from "@/components/ui/badge";
import { MODULES } from "./modules";

export function Sidebar() {
  return (
    <nav aria-label="Modules" className="w-56 shrink-0 space-y-6 border-r p-4">
      <ul>
        <li>
          <span
            aria-current="page"
            className="block rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Profil public
          </span>
        </li>
      </ul>
      <div className="space-y-2">
        <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Bientôt</p>
        <ul className="space-y-1">
          {MODULES.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground"
            >
              <span>{m.label}</span>
              <Badge variant="secondary">Bientôt</Badge>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
