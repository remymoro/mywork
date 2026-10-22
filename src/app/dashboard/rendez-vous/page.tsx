import { connection } from "next/server";
import { redirect } from "next/navigation";
import { DEFAULT_HOURS } from "@/lib/rdv";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "../shell";
import { RdvManager, type ManagedAppointment } from "./rdv-manager";

export const instant = false;

const hhmm = (time: string | null) => (time ? time.slice(0, 5) : null);

export default async function RdvPage() {
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

  const nowIso = new Date().toISOString();
  const [settingsRes, hoursRes, exceptionsRes, appointmentsRes] = await Promise.all([
    supabase.from("rdv_settings").select("enabled, durations").eq("owner_id", user.id).maybeSingle(),
    supabase.from("rdv_hours").select("weekday, start_time, end_time").eq("owner_id", user.id),
    supabase.from("rdv_exceptions").select("id, day, start_time, end_time").eq("owner_id", user.id).order("day"),
    supabase
      .from("rdv_appointments")
      .select("id, starts_at, ends_at, duration_min, guest_first, guest_last, guest_email, message")
      .eq("owner_id", user.id)
      .eq("status", "confirmed")
      .gt("ends_at", nowIso)
      .order("starts_at")
      .limit(200),
  ]);
  for (const failure of [settingsRes.error, hoursRes.error, exceptionsRes.error, appointmentsRes.error]) {
    if (failure) throw new Error(`Lecture des rendez-vous impossible : ${failure.message}`);
  }

  // Avant la première sauvegarde : réservation désactivée, 30 min, horaires par défaut (lundi–vendredi).
  const hasSettings = settingsRes.data !== null;
  const hours = hasSettings
    ? (hoursRes.data ?? []).map((h) => ({ weekday: h.weekday as number, start: hhmm(h.start_time) as string, end: hhmm(h.end_time) as string }))
    : DEFAULT_HOURS;
  const appointments = (appointmentsRes.data ?? []) as ManagedAppointment[];

  return (
    <DashboardShell
      active="rdv"
      email={user.email ?? ""}
      displayName={profile.display_name}
      username={profile.username}
      isOnline={profile.is_online}
    >
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">ESPACE PRIVÉ</p>
        <h1 className="font-heading text-3xl font-normal tracking-tight sm:text-4xl">Rendez-vous</h1>
        <p className="text-sm text-muted-foreground">
          Choisis quand on peut te réserver. Les visiteurs prennent rendez-vous depuis ton profil public, sans compte.
        </p>
      </div>
      <RdvManager
        username={profile.username}
        nowIso={nowIso}
        initial={{
          enabled: settingsRes.data?.enabled ?? false,
          durations: (settingsRes.data?.durations as number[] | undefined) ?? [30],
          hours,
          exceptions: (exceptionsRes.data ?? []).map((e) => ({
            id: e.id as string,
            day: e.day as string,
            start: hhmm(e.start_time),
            end: hhmm(e.end_time),
          })),
        }}
        appointments={appointments}
      />
    </DashboardShell>
  );
}
