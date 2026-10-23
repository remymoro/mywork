import { connection } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildDashboardData, parisWeekBounds, type AppointmentRow, type DashboardBoard,
  type DashboardCard, type DashboardList, type DashboardProfile, type DashboardResult,
} from "@/lib/dashboard";
import type { StorageUsageRow } from "@/lib/drive";
import { DashboardShell } from "./shell";
import { DashboardView } from "./dashboard-view";
import { DashboardRefresh } from "./dashboard-refresh";

export const instant = false;

// Les rejets réseau, comme les erreurs Supabase, restent locaux au bloc concerné.
async function read<T>(query: PromiseLike<DashboardResult<T>>): Promise<DashboardResult<T>> {
  try {
    const result = await query;
    return result.error ? { ...result, data: null } : result;
  } catch {
    return { data: null, error: { message: "Informations indisponibles" } };
  }
}

// Pagination complète, même si une page ultérieure échoue : aucun total partiel.
async function readAll<T>(load: (from: number, to: number) => PromiseLike<DashboardResult<T[]>>): Promise<DashboardResult<T[]>> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const result = await read(load(from, from + 499));
    if (result.error || result.data === null) return { data: null, error: result.error ?? { message: "Informations indisponibles" } };
    rows.push(...result.data);
    if (result.data.length < 500) return { data: rows, error: null };
  }
}

export default async function DashboardPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const uid = user.id;
  const now = new Date().getTime();
  const nowIso = new Date(now).toISOString();
  const week = parisWeekBounds(now);
  const rdvColumns = "id,status,starts_at,ends_at,duration_min,guest_first,guest_last,guest_company,guest_role,reason";
  const [profileRes, nextRes, weekRes, settingsRes, experienceRes, projectRes, boardsRes, listsRes, cardsRes, filesRes, publicFilesRes, storageRes] = await Promise.all([
    read(supabase.from("profiles").select("username,display_name,is_online,headline,avatar_url,location,about,contact_email,website_url,linkedin_url,github_url,other_url,skills,top_skills").eq("id", uid).maybeSingle<DashboardProfile>()),
    read(supabase.from("rdv_appointments").select(rdvColumns).eq("owner_id", uid).eq("status", "confirmed").gt("ends_at", nowIso).order("starts_at").order("id").limit(1).maybeSingle<AppointmentRow>()),
    read(supabase.from("rdv_appointments").select(rdvColumns, { count: "exact" }).eq("owner_id", uid).eq("status", "confirmed").gte("starts_at", week.startIso).lt("starts_at", week.endIso).gt("ends_at", nowIso).order("starts_at").order("id").limit(3).returns<AppointmentRow[]>()),
    read(supabase.from("rdv_settings").select("enabled").eq("owner_id", uid).maybeSingle<{ enabled: boolean }>()),
    read(supabase.from("profile_experiences").select("id").eq("profile_id", uid).eq("is_visible", true).order("id").limit(1)),
    read(supabase.from("profile_projects").select("id").eq("profile_id", uid).eq("is_visible", true).order("id").limit(1)),
    // La RLS inclut aussi les tableaux partagés avec la session.
    readAll((from, to) => supabase.from("kanban_boards").select("id,name,owner_id").order("id").range(from, to).returns<DashboardBoard[]>()),
    readAll((from, to) => supabase.from("kanban_lists").select("id,board_id,is_done_list").order("id").range(from, to).returns<DashboardList[]>()),
    readAll((from, to) => supabase.from("kanban_cards").select("id,board_id,list_id").order("id").range(from, to).returns<DashboardCard[]>()),
    read(supabase.from("drive_files").select("id", { count: "exact", head: true }).eq("owner_id", uid)),
    read(supabase.from("drive_files").select("id", { count: "exact", head: true }).eq("owner_id", uid).eq("is_public", true)),
    read<StorageUsageRow[]>(supabase.rpc("storage_usage")),
  ]);

  // Une erreur ne doit jamais provoquer une boucle avec /onboarding.
  if (profileRes.error) throw new Error(`Lecture du profil impossible : ${profileRes.error.message}`);
  const profile = profileRes.data;
  if (!profile) redirect("/onboarding");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const data = buildDashboardData({
    now, origin: `${proto}://${host}`, profile, storageLimitRaw: process.env.STORAGE_LIMIT_BYTES,
    next: nextRes, week: weekRes, settings: settingsRes, experiences: experienceRes, projects: projectRes,
    boards: boardsRes, lists: listsRes, cards: cardsRes, files: filesRes, publicFiles: publicFilesRes, storage: storageRes,
  });

  return (
    <DashboardShell active="accueil" email={user.email ?? ""} displayName={profile.display_name} username={profile.username} isOnline={profile.is_online}>
      <DashboardRefresh refreshAt={data.refreshAt} />
      <DashboardView data={data} />
    </DashboardShell>
  );
}
