import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "../profile-editor";
import { DashboardShell } from "../shell";

// Page dépendante de la session : elle bloque côté serveur (voir docs/decisions.md).
export const instant = false;

export default async function ProfilePage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, headline, is_online")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  return (
    <DashboardShell
      active="profil"
      email={user.email ?? ""}
      username={profile.username}
      isOnline={profile.is_online}
    >
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          ESPACE PRIVÉ
        </p>
        <h1 className="font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          Profil public
        </h1>
        <p className="text-sm text-muted-foreground">
          Choisis ce que les visiteurs voient sur ta page.
        </p>
      </div>
      <ProfileEditor
        key={`${profile.username}|${profile.display_name}|${profile.headline}`}
        username={profile.username}
        displayName={profile.display_name ?? ""}
        headline={profile.headline ?? ""}
      />
    </DashboardShell>
  );
}
