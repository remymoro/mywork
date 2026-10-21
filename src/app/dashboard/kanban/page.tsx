import { connection } from "next/server";
import { redirect } from "next/navigation";
import { KanbanWorkspace } from "@/components/kanban/kanban-workspace";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "../shell";
import { loadKanbanContent, loadOwnedBoards } from "./data";

export const instant = false;

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ tableau?: string | string[]; carte?: string | string[] }>;
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
  const boards = await loadOwnedBoards(supabase, user.id);
  const content = await loadKanbanContent(supabase, boards);

  return (
    <DashboardShell
      active="kanban"
      email={user.email ?? ""}
      displayName={profile.display_name}
      username={profile.username}
      isOnline={profile.is_online}
    >
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          ESPACE PRIVÉ
        </p>
        <h1 className="font-heading text-3xl font-normal tracking-tight sm:text-4xl">Kanban</h1>
        <p className="text-sm text-muted-foreground">
          Fais avancer tes projets, une carte à la fois.
        </p>
      </div>
      <KanbanWorkspace
        boards={boards}
        {...content}
        username={profile.username}
        selectedSlug={typeof query.tableau === "string" ? query.tableau : undefined}
        selectedCardId={typeof query.carte === "string" ? query.carte : undefined}
      />
    </DashboardShell>
  );
}
