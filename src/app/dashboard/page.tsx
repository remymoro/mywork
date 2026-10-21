import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { ProfileEditor } from "./profile-editor";
import { Sidebar } from "./sidebar";

// Page dépendante de la session ou de l'URL : elle bloque côté serveur (voir docs/decisions.md).
export const instant = false;

export default async function DashboardPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, headline")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

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
        <Sidebar />
        <main className="flex-1 space-y-6 p-6 sm:p-8">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              ESPACE PRIVÉ
            </p>
            <h1 className="font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
              Bonjour {profile.display_name ?? profile.username}
            </h1>
            <p className="text-sm text-muted-foreground">
              Gère ton profil public et prépare tes prochains modules.
            </p>
          </div>
          <ProfileEditor
            key={`${profile.username}|${profile.display_name}|${profile.headline}`}
            username={profile.username}
            displayName={profile.display_name ?? ""}
            headline={profile.headline ?? ""}
          />
        </main>
      </div>
    </div>
  );
}
