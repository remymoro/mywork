import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { signOut } from "./actions";
import { Sidebar, type SidebarActive } from "./sidebar";

export function DashboardShell({
  active,
  email,
  username,
  isOnline,
  children,
}: {
  active: SidebarActive;
  email: string;
  username: string;
  isOnline: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-sidebar px-6 py-3">
        <Logo />
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Se déconnecter
          </Button>
        </form>
      </header>
      <div className="flex flex-1">
        <Sidebar active={active} email={email} username={username} isOnline={isOnline} />
        <main className="flex-1 space-y-6 p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
