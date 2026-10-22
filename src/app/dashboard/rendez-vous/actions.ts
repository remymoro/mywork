"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sendEmail, type Email } from "@/lib/email";
import {
  ROUND_MESSAGE,
  isRoundTime,
  isTime,
  rdvErrorMessage,
  validateDurations,
  validateHours,
  type HourRange,
} from "@/lib/rdv";
import { cancellationEmail, rescheduleEmail, type RdvDescription } from "@/lib/rdv-emails";
import { createClient } from "@/lib/supabase/server";

export type RdvActionResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const FALLBACK = "Impossible d'enregistrer. Réessaie.";
const MAX_RANGES = 70;
const MAX_EXCEPTIONS = 100;

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function deliver(email: Email | null) {
  if (email) await sendEmail(email);
}

const done = (): RdvActionResult => {
  revalidatePath("/dashboard/rendez-vous");
  return { ok: true };
};

/** Réglages : activation, durées proposées et horaires de la semaine. */
export async function saveSettings(input: {
  enabled: boolean;
  durations: number[];
  hours: HourRange[];
}): Promise<RdvActionResult> {
  const durations = [...new Set(input.durations)].sort((a, b) => a - b);
  const problem = validateDurations(durations) ?? validateHours(input.hours);
  if (problem) return { ok: false, error: problem };
  if (input.hours.length > MAX_RANGES) return { ok: false, error: "Trop de plages horaires." };

  // Réglages et horaires remplacés d'un seul bloc par la base (une transaction).
  const { supabase } = await currentUser();
  const { error } = await supabase.rpc("rdv_save_settings", {
    p_enabled: Boolean(input.enabled),
    p_durations: durations,
    p_hours: input.hours.map(({ weekday, start, end }) => ({ weekday, start, end })),
  });
  return error ? { ok: false, error: FALLBACK } : done();
}

/** Exception : sans heures, le jour est fermé ; avec heures, elles remplacent les horaires habituels. */
export async function addException(input: { day: string; start?: string; end?: string }): Promise<RdvActionResult> {
  if (!DAY.test(input.day) || Number.isNaN(Date.parse(`${input.day}T00:00:00Z`))) {
    return { ok: false, error: "Date invalide." };
  }
  const hasHours = Boolean(input.start || input.end);
  if (hasHours) {
    if (!input.start || !input.end || !isTime(input.start) || !isTime(input.end)) {
      return { ok: false, error: "Indique une heure de début et une heure de fin valides." };
    }
    if (input.end <= input.start) return { ok: false, error: "La fin doit être après le début." };
    if (!isRoundTime(input.start) || !isRoundTime(input.end)) return { ok: false, error: ROUND_MESSAGE };
  }
  const { supabase, userId } = await currentUser();
  const count = await supabase.from("rdv_exceptions").select("id", { count: "exact", head: true }).eq("owner_id", userId);
  if ((count.count ?? 0) >= MAX_EXCEPTIONS) return { ok: false, error: "100 exceptions au maximum." };
  const { error } = await supabase.from("rdv_exceptions").insert({
    owner_id: userId,
    day: input.day,
    start_time: hasHours ? input.start : null,
    end_time: hasHours ? input.end : null,
  });
  return error ? { ok: false, error: FALLBACK } : done();
}

export async function removeException(id: string): Promise<RdvActionResult> {
  if (!UUID.test(id)) return { ok: false, error: FALLBACK };
  const { supabase, userId } = await currentUser();
  const { error } = await supabase.from("rdv_exceptions").delete().eq("id", id).eq("owner_id", userId);
  return error ? { ok: false, error: FALLBACK } : done();
}

/** Annule un rendez-vous : le visiteur est prévenu par e-mail. */
export async function ownerCancel(id: string): Promise<RdvActionResult> {
  if (!UUID.test(id)) return { ok: false, error: FALLBACK };
  const { supabase } = await currentUser();
  const { data, error } = await supabase.rpc("rdv_owner_cancel", { p_id: id });
  if (error || !data) return { ok: false, error: rdvErrorMessage(error).error };
  await deliver(cancellationEmail(data as RdvDescription, "owner", await siteOrigin()));
  return done();
}

/** Reporte un rendez-vous à un autre créneau : l'ancien est libéré, le visiteur est prévenu par e-mail. */
export async function ownerReschedule(id: string, newStart: string): Promise<RdvActionResult> {
  const start = new Date(newStart);
  if (!UUID.test(id) || Number.isNaN(start.getTime())) return { ok: false, error: FALLBACK };
  const { supabase } = await currentUser();
  const { data, error } = await supabase.rpc("rdv_owner_reschedule", { p_id: id, p_new_start: start.toISOString() });
  if (error || !data) return { ok: false, error: rdvErrorMessage(error).error };
  const { before, after } = data as { before: RdvDescription; after: RdvDescription };
  await deliver(rescheduleEmail(before, after, "owner", await siteOrigin()));
  return done();
}
