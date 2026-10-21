import Link from "next/link";
import {
  Calendar,
  FileText,
  FolderOpen,
  LayoutGrid,
  LayoutDashboard,
  User,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MODULES } from "./modules";
import { UserMenu } from "./user-menu";

const MODULE_ICONS = {
  cv: FileText,
  rdv: Calendar,
  boards: LayoutGrid,
  fichiers: FolderOpen,
  visio: Video,
} as const;

const NAV = [
  { id: "accueil", href: "/dashboard", label: "Mon tableau de bord", Icon: LayoutDashboard },
  { id: "profil", href: "/dashboard/profil", label: "Mon profil", Icon: User },
] as const;

export type SidebarActive = (typeof NAV)[number]["id"];

export function Sidebar({
  active,
  email,
  username,
  isOnline,
}: {
  active: SidebarActive;
  email: string;
  username: string;
  isOnline: boolean;
}) {
  return (
    <nav
      aria-label="Modules"
      className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground"
    >
      <div className="space-y-6">
        <ul className="space-y-1">
          {NAV.map(({ id, href, label, Icon }) => {
            const isActive = id === active;
            return (
              <li key={id}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "flex items-center gap-3 border-l-[3px] border-primary bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground"
                      : "flex items-center gap-3 border-l-[3px] border-transparent px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                  }
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
                  {label}
                </Link>
              </li>
            );
          })}
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
      </div>

      <div className="mt-auto border-t border-sidebar-border pt-3">
        <UserMenu email={email} username={username} isOnline={isOnline} />
      </div>
    </nav>
  );
}
