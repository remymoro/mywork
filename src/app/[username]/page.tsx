import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, headline")
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

  return (
    <main className="mx-auto max-w-2xl space-y-2 p-6">
      <h1 className="text-3xl font-semibold">{profile.display_name ?? profile.username}</h1>
      {profile.headline && <p className="text-muted-foreground">{profile.headline}</p>}
    </main>
  );
}
