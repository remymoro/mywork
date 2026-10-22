// Règles communes aux pages, aux boutons et à l'émission des jetons.
export type VisioAppointment = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
};

export type VisioInput = { role: "guest"; token: string } | { role: "owner"; id: string };
export type VisioState = "waiting" | "open" | "ended" | "cancelled" | "invalid";
export const VISIO_EARLY_MS = 10 * 60_000;
export const isVisioId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Aucun horaire, droit ou identifiant de participant n'est accepté du navigateur. */
export function parseVisioInput(value: unknown): VisioInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 2) return null;
  if (input.role === "guest" && isVisioId(input.token)) return { role: "guest", token: input.token };
  if (input.role === "owner" && isVisioId(input.id)) return { role: "owner", id: input.id };
  return null;
}

export const visioOpensAt = (startsAt: string) => Date.parse(startsAt) - VISIO_EARLY_MS;

export function visioState(a: Pick<VisioAppointment, "status" | "starts_at" | "ends_at">, now: number): VisioState {
  const start = Date.parse(a.starts_at);
  const end = Date.parse(a.ends_at);
  if (![start, end, now].every(Number.isFinite) || end <= start) return "invalid";
  if (a.status === "cancelled") return "cancelled";
  if (a.status !== "confirmed") return "invalid";
  if (now >= end) return "ended";
  return now < visioOpensAt(a.starts_at) ? "waiting" : "open";
}

export const visioRoomName = (id: string) => `rdv-${id.toLowerCase()}`;
export const visioIdentity = (role: VisioInput["role"], id: string) => `${role}:${id.toLowerCase()}`;
