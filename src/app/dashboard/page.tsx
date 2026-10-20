import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

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
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Bonjour {profile.display_name ?? profile.username}</h1>
      <p>
        Ton profil public :{" "}
        <Link className="underline" href={`/${profile.username}`}>
          mywork.website/{profile.username}
        </Link>
      </p>
      <div className="flex gap-3">
        <Link href="/dashboard/profil" className={buttonVariants()}>
          Modifier mon profil
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Se déconnecter
          </Button>
        </form>
      </div>
    </main>
  );
}
