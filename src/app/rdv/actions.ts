"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sendEmail, type Email } from "@/lib/email";
import { RDV_FALLBACK, rdvErrorMessage, validateBooking } from "@/lib/rdv";
import {
  cancellationEmail,
  confirmationForGuest,
  newBookingForOwner,
  rescheduleEmail,
  type RdvDescription,
} from "@/lib/rdv-emails";
import { createClient } from "@/lib/supabase/server";

export type BookingResult =
  | { ok: true; appointment: { token: string; starts_at: string; duration_min: number; owner_name: string } }
  | { ok: false; error: string; slotTaken?: boolean };
export type ChangeResult = { ok: true } | { ok: false; error: string; slotTaken?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Adresse du site, pour les liens des e-mails. */
async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function deliver(...emails: (Email | null)[]) {
  await Promise.all(emails.filter((e): e is Email => e !== null).map((e) => sendEmail(e)));
}

export async function bookAppointment(input: {
  username: string;
  start: string;
  duration: number;
  first: string;
  last: string;
  email: string;
  message: string;
  /** Champ piège : invisible pour une personne, rempli par les robots. */
  website?: string;
}): Promise<BookingResult> {
  if (input.website) return { ok: false, error: RDV_FALLBACK };
  const errors = validateBooking(input);
  const firstError = Object.values(errors)[0];
  if (firstError) return { ok: false, error: firstError };
  const start = new Date(input.start);
  if (typeof input.username !== "string" || Number.isNaN(start.getTime()) || !Number.isInteger(input.duration)) {
    return { ok: false, error: RDV_FALLBACK };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rdv_book", {
    p_username: input.username,
    p_start: start.toISOString(),
    p_duration: input.duration,
    p_first: input.first,
    p_last: input.last,
    p_email: input.email,
    p_message: input.message,
  });
  if (error || !data) return { ok: false, ...rdvErrorMessage(error) };

  const appointment = data as RdvDescription;
  const origin = await siteOrigin();
  await deliver(confirmationForGuest(appointment, origin), newBookingForOwner(appointment, origin));
  return {
    ok: true,
    appointment: {
      token: appointment.token,
      starts_at: appointment.starts_at,
      duration_min: appointment.duration_min,
      owner_name: appointment.owner_name,
    },
  };
}

export async function cancelAppointment(token: string): Promise<ChangeResult> {
  if (!UUID.test(token)) return { ok: false, error: RDV_FALLBACK };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rdv_cancel", { p_token: token });
  if (error || !data) return { ok: false, ...rdvErrorMessage(error) };
  await deliver(cancellationEmail(data as RdvDescription, "guest", await siteOrigin()));
  revalidatePath(`/rdv/${token}`);
  return { ok: true };
}

export async function rescheduleAppointment(token: string, newStart: string): Promise<ChangeResult> {
  const start = new Date(newStart);
  if (!UUID.test(token) || Number.isNaN(start.getTime())) return { ok: false, error: RDV_FALLBACK };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rdv_reschedule", { p_token: token, p_new_start: start.toISOString() });
  if (error || !data) return { ok: false, ...rdvErrorMessage(error) };
  const { before, after } = data as { before: RdvDescription; after: RdvDescription };
  await deliver(rescheduleEmail(before, after, "guest", await siteOrigin()));
  revalidatePath(`/rdv/${token}`);
  return { ok: true };
}
