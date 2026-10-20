import { connection } from "next/server";
import { notFound, permanentRedirect } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { createClient } from "@/lib/supabase/server";

// Page dépendante de la session ou de l'URL : elle bloque côté serveur (voir docs/decisions.md).
export const instant = false;

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  await connection();
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    // Ancien pseudo ? on redirige vers le pseudo actuel.
    const { data: old } = await supabase
      .from("username_history")
      .select("profile_id")
      .eq("old_username", username)
      .maybeSingle();
    if (old) {
      const { data: current } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", old.profile_id)
        .maybeSingle();
      if (current) permanentRedirect(`/${current.username}`);
    }
    notFound();
  }

  return <ProfileView profile={profile} />;
}
