import Link from "next/link";
import {
  Calendar,
  FolderOpen,
  LayoutGrid,
  LayoutDashboard,
  User,
} from "lucide-react";
import { UserMenu } from "./user-menu";

const NAV = [
  { id: "accueil", href: "/dashboard", label: "Mon tableau de bord", shortLabel: "Accueil", Icon: LayoutDashboard },
  { id: "profil", href: "/dashboard/profil", label: "Mon profil", shortLabel: "Profil", Icon: User },
  { id: "kanban", href: "/dashboard/kanban", label: "Kanban", shortLabel: "Kanban", Icon: LayoutGrid },
  { id: "rdv", href: "/dashboard/rendez-vous", label: "Rendez-vous", shortLabel: "RDV", Icon: Calendar },
  { id: "fichiers", href: "/dashboard/fichiers", label: "Fichiers", shortLabel: "Fichiers", Icon: FolderOpen },
] as const;

export type SidebarActive = (typeof NAV)[number]["id"];

export function Sidebar({
  active,
  email,
  displayName,
  username,
  isOnline,
}: {
  active: SidebarActive;
  email: string;
  displayName: string | null;
  username: string;
  isOnline: boolean;
}) {
  return (
    <nav
      aria-label="Modules"
      className="flex w-full min-w-0 shrink-0 flex-col gap-2 border-b border-sidebar-border bg-sidebar p-2 text-sidebar-foreground md:w-60 md:border-r md:border-b-0 md:p-4"
    >
      <div className="min-w-0 space-y-6">
        <ul className="grid grid-cols-5 gap-1 md:block md:space-y-1">
          {NAV.map(({ id, href, label, shortLabel, Icon }) => {
            const isActive = id === active;
            return (
              <li key={id}>
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "flex min-w-0 items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-2.5 text-sm font-medium text-primary-foreground md:justify-start md:gap-3 md:px-3 md:py-2"
                      : "flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent md:justify-start md:gap-3 md:px-3 md:py-2"
                  }
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
                  {shortLabel === label ? (
                    <span aria-hidden="true">{label}</span>
                  ) : (
                    <>
                      <span aria-hidden="true" className="md:hidden">{shortLabel}</span>
                      <span aria-hidden="true" className="hidden md:inline">{label}</span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="order-first border-b border-sidebar-border pb-2 md:order-last md:mt-auto md:border-t md:border-b-0 md:pt-3 md:pb-0">
        <UserMenu email={email} displayName={displayName} username={username} isOnline={isOnline} />
      </div>
    </nav>
  );
}
