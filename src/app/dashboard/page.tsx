import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "./shell";

// Page dépendante de la session : elle bloque côté serveur (voir docs/decisions.md).
export const instant = false;

export default async function DashboardPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, display_name, is_online")
    .eq("id", user.id)
    .maybeSingle();
  // Une erreur de lecture ne doit pas renvoyer vers /onboarding (boucle avec /dashboard).
  if (error) throw new Error(`Lecture du profil impossible : ${error.message}`);
  if (!profile) redirect("/onboarding");

  const userName = profile.display_name ?? profile.username;

  return (
    <DashboardShell
      active="accueil"
      email={user.email ?? ""}
      username={profile.username}
      isOnline={profile.is_online}
    >
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          ESPACE PRIVÉ
        </p>
        <h1 className="font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          Mon tableau de bord
        </h1>
        <p className="text-sm text-muted-foreground">Bonjour {userName}</p>
      </div>
      <p className="text-sm text-muted-foreground">Futures informations sur mon espace</p>
    </DashboardShell>
  );
}
