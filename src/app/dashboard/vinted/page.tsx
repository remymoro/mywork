import { connection } from "next/server";
import { redirect } from "next/navigation";
import { VintedWorkspace } from "@/components/vinted/vinted-workspace";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "../shell";
import { loadVinted } from "./data";

export const instant = false;

export default async function VintedPage({
  searchParams,
}: {
  searchParams: Promise<{ etape?: string | string[] }>;
}) {
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
  if (error) throw new Error(`Lecture du profil impossible : ${error.message}`);
  if (!profile) redirect("/onboarding");

  const query = await searchParams;
  const stage = typeof query.etape === "string" ? query.etape : null;
  const items = await loadVinted(supabase, user.id);

  return (
    <DashboardShell
      active="vinted"
      email={user.email ?? ""}
      displayName={profile.display_name}
      username={profile.username}
      isOnline={profile.is_online}
    >
      <VintedWorkspace items={items} stage={stage} now={new Date().toISOString()} />
    </DashboardShell>
  );
}
