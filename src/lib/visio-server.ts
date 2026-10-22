import "server-only";
import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";
import { parseVisioInput, visioIdentity, visioRoomName, visioState, type VisioAppointment, type VisioInput } from "./visio";

export class VisioError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

const unavailable = () => new VisioError("unavailable", "Le service de visio est indisponible. Réessaie dans un instant.", 503);

/** Même autorisation pour la page et le POST, sans clé privilégiée Supabase. */
export async function getVisioAppointment(input: VisioInput): Promise<VisioAppointment> {
  const parsed = parseVisioInput(input);
  if (!parsed) throw new VisioError("invalid", "Demande de visio invalide.", 400);
  try {
    const supabase = await createClient();
    let data;
    if (parsed.role === "guest") {
      const result = await supabase.rpc("rdv_get", { p_token: parsed.token });
      if (result.error) throw unavailable();
      data = result.data;
    } else {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new VisioError("unauthenticated", "Connecte-toi pour rejoindre la visio.", 401);
      const result = await supabase.from("rdv_appointments")
        .select("id, owner_id, status, starts_at, ends_at")
        .eq("id", parsed.id).eq("owner_id", user.id).maybeSingle();
      if (result.error) throw unavailable();
      data = result.data;
      if (data && data.owner_id !== user.id) data = null;
    }
    if (!data) throw new VisioError("not_found", "Ce lien de rendez-vous est introuvable.", 404);
    // Seuls les champs nécessaires quittent le serveur, jamais le code privé du visiteur.
    return { id: data.id, status: data.status, starts_at: data.starts_at, ends_at: data.ends_at };
  } catch (error) {
    if (error instanceof VisioError) throw error;
    throw unavailable();
  }
}

function requireOpen(a: VisioAppointment, now: number) {
  switch (visioState(a, now)) {
    case "open": return;
    case "waiting": throw new VisioError("waiting", "La visio ouvre 10 min avant le rendez-vous.", 409);
    case "ended": throw new VisioError("ended", "Ce rendez-vous est terminé.", 410);
    case "cancelled": throw new VisioError("cancelled", "Ce rendez-vous est annulé.", 410);
    default: throw new VisioError("invalid", "Ce rendez-vous ne permet pas de rejoindre une visio.", 409);
  }
}

function livekitConfig() {
  const { LIVEKIT_URL: serverUrl, LIVEKIT_API_KEY: apiKey, LIVEKIT_API_SECRET: apiSecret } = process.env;
  if (!serverUrl || !apiKey?.trim() || !apiSecret?.trim()) throw unavailable();
  try {
    const url = new URL(serverUrl);
    if (url.protocol !== "wss:" || url.username || url.password || url.search || url.hash) throw unavailable();
    return { serverUrl, serviceUrl: serverUrl.replace(/^wss:/, "https:"), apiKey, apiSecret };
  } catch { throw unavailable(); }
}

export async function issueVisioToken(input: VisioInput) {
  const appointment = await getVisioAppointment(input);
  requireOpen(appointment, Date.now());
  const { serverUrl, serviceUrl, apiKey, apiSecret } = livekitConfig();
  const room = visioRoomName(appointment.id);
  try {
    const rooms = new RoomServiceClient(serviceUrl, apiKey, apiSecret);
    await rooms.createRoom({ name: room, maxParticipants: 2, emptyTimeout: 300, departureTimeout: 60 });
    const now = Date.now();
    requireOpen(appointment, now);
    const expiresAt = Math.min(Math.floor(now / 1000) + 60, Math.floor(Date.parse(appointment.ends_at) / 1000));
    if (expiresAt <= now / 1000) throw new VisioError("ended", "Ce rendez-vous est terminé.", 410);
    const access = new AccessToken(apiKey, apiSecret, { identity: visioIdentity(input.role, appointment.id), ttl: 60 });
    // toJwt accepte aussi une expiration Unix absolue : aucun décalage pendant la signature.
    access.ttl = expiresAt;
    access.addGrant({
      room, roomJoin: true, canPublish: true, canSubscribe: true,
      canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE],
      canPublishData: false, canUpdateOwnMetadata: false,
    });
    const token = await access.toJwt();
    requireOpen(appointment, Date.now());
    return { token, serverUrl, endsAt: appointment.ends_at, serverNow: new Date().toISOString() };
  } catch (error) {
    if (error instanceof VisioError) throw error;
    throw unavailable();
  }
}
