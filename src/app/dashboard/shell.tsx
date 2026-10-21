import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { signOut } from "./actions";
import { Sidebar, type SidebarActive } from "./sidebar";

export function DashboardShell({
  active,
  email,
  displayName,
  username,
  isOnline,
  children,
}: {
  active: SidebarActive;
  email: string;
  displayName: string | null;
  username: string;
  isOnline: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-3 border-b bg-sidebar px-4 py-3 sm:px-6">
        <Logo />
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Se déconnecter
          </Button>
        </form>
      </header>
      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        <Sidebar active={active} email={email} displayName={displayName} username={username} isOnline={isOnline} />
        <main className="min-w-0 flex-1 space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
