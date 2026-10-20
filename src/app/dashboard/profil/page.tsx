import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, type ProfileData } from "./profile-form";

// Page dépendante de la session ou de l'URL : elle bloque côté serveur (voir docs/decisions.md).
export const instant = false;

export default async function EditProfilePage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // select("*") : fonctionne aussi avant la migration des détails du profil.
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!data) redirect("/onboarding");

  const profile: ProfileData = {
    username: data.username,
    display_name: data.display_name ?? null,
    headline: data.headline ?? null,
    bio: data.bio ?? null,
    location: data.location ?? null,
    website: data.website ?? null,
    linkedin_url: data.linkedin_url ?? null,
    github_url: data.github_url ?? null,
    avatar_url: data.avatar_url ?? null,
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 pt-16">
      <div className="space-y-1">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Tableau de bord
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Modifier mon profil</h1>
        <p className="text-muted-foreground">
          Ce que les visiteurs voient sur{" "}
          <Link className="underline" href={`/${profile.username}`}>
            mywork.website/{profile.username}
          </Link>
          .
        </p>
      </div>
      <ProfileForm profile={profile} />
    </main>
  );
}
