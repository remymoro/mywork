// Règles pures du module Rendez-vous (docs/rendez-vous.md, D26). Elles reprennent exactement celles de la base
// (`rdv_validate_slot`) : la base reste l'autorité, ce fichier sert à afficher les créneaux libres.

export const TIME_ZONE = "Europe/Paris";
export const DURATIONS = [15, 30, 60] as const;
export type Duration = (typeof DURATIONS)[number];
export const MIN_NOTICE_HOURS = 4;
export const HORIZON_MONTHS = 2;

export type RdvConfig = {
  durations: number[];
  /** Plages hebdomadaires ; weekday : 1 = lundi … 7 = dimanche. */
  hours: { weekday: number; start: string; end: string }[];
  /** Sans heures = jour fermé ; avec heures = ces plages remplacent les horaires habituels ce jour-là. */
  exceptions: { day: string; start: string | null; end: string | null }[];
  /** Rendez-vous confirmés (instants ISO). */
  busy: { start: string; end: string }[];
};

export const DEFAULT_HOURS: RdvConfig["hours"] = [1, 2, 3, 4, 5].flatMap((weekday) => [
  { weekday, start: "09:00", end: "12:00" },
  { weekday, start: "14:00", end: "18:00" },
]);

const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Date et heure à Paris d'un instant. */
export function parisParts(instant: Date) {
  const p = Object.fromEntries(PARTS.formatToParts(instant).map((x) => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute };
}

/** Jour à Paris au format AAAA-MM-JJ. */
export function parisDay(instant: Date): string {
  const p = parisParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** L'instant qui correspond à « ce jour, cette heure » à Paris (gère l'heure d'été). */
export function parisInstant(day: string, time: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, min);
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const p = parisParts(new Date(guess));
    guess -= Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - wall;
  }
  return new Date(guess);
}

/** 1 = lundi … 7 = dimanche pour un jour AAAA-MM-JJ. */
export function isoWeekday(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const fromMinutes = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

/** Plages ouvertes ce jour-là : exception (fermé ou horaires particuliers) sinon horaires de la semaine. */
export function rangesFor(config: RdvConfig, day: string): { start: string; end: string }[] {
  const exceptions = config.exceptions.filter((e) => e.day === day);
  if (exceptions.length > 0) {
    if (exceptions.some((e) => e.start === null || e.end === null)) return [];
    return exceptions.map((e) => ({ start: e.start as string, end: e.end as string }));
  }
  const weekday = isoWeekday(day);
  return config.hours.filter((h) => h.weekday === weekday).map(({ start, end }) => ({ start, end }));
}

/** Dernier instant réservable : maintenant + 2 mois. */
export function horizonEnd(now: Date): Date {
  // Même règle que PostgreSQL (`now() + interval '2 months'`) : le 31 décembre donne le 28 février, pas le 3 mars.
  const end = new Date(now);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + HORIZON_MONTHS);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}

/** Créneaux libres d'un jour pour une durée : instants de début (ISO), triés. */
export function slotsForDay(config: RdvConfig, durationMin: number, day: string, now: Date): string[] {
  if (!config.durations.includes(durationMin)) return [];
  const earliest = now.getTime() + MIN_NOTICE_HOURS * 3600_000;
  const latest = horizonEnd(now).getTime();
  const busy = config.busy.map((b) => [Date.parse(b.start), Date.parse(b.end)] as const);
  const slots = new Set<number>();
  const [y, m, d] = day.split("-").map(Number);
  const wall = (minutes: number) => Date.UTC(y, m - 1, d, 0, minutes);
  for (const range of rangesFor(config, day)) {
    const first = toMinutes(range.start);
    const last = toMinutes(range.end);
    // Le décalage avec Paris ne change pas dans la plage (sauf la nuit du changement d'heure) : on le calcule
    // une fois, au lieu de convertir chaque créneau (conversion coûteuse, répétée des milliers de fois par le calendrier).
    const offsetAtStart = parisInstant(day, fromMinutes(first)).getTime() - wall(first);
    const sameOffset = parisInstant(day, fromMinutes(last - 1)).getTime() - wall(last - 1) === offsetAtStart;
    for (let t = first; t + durationMin <= last; t += durationMin) {
      const start = sameOffset ? wall(t) + offsetAtStart : parisInstant(day, fromMinutes(t)).getTime();
      // Nuit du changement d'heure : comme la base, on écarte un créneau dont l'heure affichée ou la durée
      // « à l'horloge » ne correspondent plus.
      if (!sameOffset) {
        const s = parisParts(new Date(start));
        const e = parisParts(new Date(start + durationMin * 60_000));
        const wallStart = s.hour * 60 + s.minute;
        if (wallStart !== t || e.day !== s.day || e.hour * 60 + e.minute - wallStart !== durationMin) continue;
      }
      const end = start + durationMin * 60_000;
      if (start < earliest || start > latest) continue;
      if (busy.some(([bs, be]) => start < be && end > bs)) continue;
      slots.add(start);
    }
  }
  return [...slots].sort((a, b) => a - b).map((t) => new Date(t).toISOString());
}

/** Jours d'un mois (AAAA-MM) qui ont au moins un créneau libre. */
export function availableDays(config: RdvConfig, durationMin: number, month: string, now: Date): Set<string> {
  const days = new Set<string>();
  for (let n = 0; n < 31; n++) {
    const day = addDays(`${month}-01`, n);
    if (!day.startsWith(month)) break;
    if (slotsForDay(config, durationMin, day, now).length > 0) days.add(day);
  }
  return days;
}

/** Le mois a-t-il des jours dans la fenêtre réservable ? (pour griser les flèches du calendrier) */
export function monthInWindow(month: string, now: Date): boolean {
  const first = `${month}-01`;
  const lastDay = addDays(`${addMonth(month, 1)}-01`, -1);
  return lastDay >= parisDay(now) && first <= parisDay(horizonEnd(now));
}

export function addMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}`;
}

// Affichage -----------------------------------------------------------------------------------------

const TIME = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const LONG = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** « 09:30 » (heure de Paris). */
export const formatTime = (iso: string) => TIME.format(new Date(iso));
/** « vendredi 23 octobre 2026 » (jour à Paris). */
export const formatLongDate = (iso: string) => LONG.format(new Date(iso));

// Saisie du visiteur --------------------------------------------------------------------------------

export type BookingInput = { first: string; last: string; email: string; message: string };
export type BookingErrors = Partial<Record<keyof BookingInput, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateBooking(input: BookingInput): BookingErrors {
  const errors: BookingErrors = {};
  const first = input.first.trim();
  const last = input.last.trim();
  const email = input.email.trim();
  if (first.length < 1 || first.length > 80) errors.first = "Indique ton prénom (80 caractères au maximum).";
  if (last.length < 1 || last.length > 80) errors.last = "Indique ton nom (80 caractères au maximum).";
  if (!EMAIL.test(email) || email.length > 254) errors.email = "Indique une adresse e-mail valide.";
  if (input.message.trim().length > 1000) errors.message = "Message trop long : 1 000 caractères au maximum.";
  return errors;
}

// Réglages du propriétaire --------------------------------------------------------------------------

export type HourRange = { weekday: number; start: string; end: string };

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isTime = (value: string) => TIME_PATTERN.test(value);
/** Heures aux minutes multiples de 5 (09:05, pas 09:02), comme l'impose la base. */
export const isRoundTime = (value: string) => isTime(value) && toMinutes(value) % 5 === 0;
export const ROUND_MESSAGE = "Choisis des heures aux minutes rondes (multiples de 5, ex. 09:05).";

/** Vérifie les plages d'une semaine : heures valides, fin après début, pas de chevauchement dans un même jour. */
export function validateHours(ranges: HourRange[]): string | null {
  for (const r of ranges) {
    if (!Number.isInteger(r.weekday) || r.weekday < 1 || r.weekday > 7) return "Jour de la semaine invalide.";
    if (!isTime(r.start) || !isTime(r.end)) return "Heure invalide.";
    if (toMinutes(r.end) <= toMinutes(r.start)) return "Une plage doit finir après son début.";
    if (!isRoundTime(r.start) || !isRoundTime(r.end)) return ROUND_MESSAGE;
  }
  for (let weekday = 1; weekday <= 7; weekday++) {
    const day = ranges.filter((r) => r.weekday === weekday).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    for (let i = 1; i < day.length; i++) {
      if (toMinutes(day[i].start) < toMinutes(day[i - 1].end)) return "Deux plages d'un même jour se chevauchent.";
    }
  }
  return null;
}

export function validateDurations(durations: number[]): string | null {
  if (durations.length === 0) return "Choisis au moins une durée.";
  if (durations.some((d) => !(DURATIONS as readonly number[]).includes(d))) return "Durée non proposée (15, 30 ou 60 minutes).";
  return null;
}

// Erreurs ----------------------------------------------------------------------------------------

export const RDV_FALLBACK = "Impossible d'enregistrer le rendez-vous. Réessaie dans un instant.";

/** Les erreurs de la base (messages fixes) deviennent des phrases pour le visiteur ; rien d'interne n'est montré. */
export function rdvErrorMessage(error: { message: string } | null): { error: string; slotTaken?: boolean } {
  switch (error?.message) {
    case "rdv_slot_taken":
      return { error: "Ce créneau vient d'être pris. Choisis-en un autre.", slotTaken: true };
    case "rdv_limit":
      return { error: "Trop de réservations avec cette adresse pour le moment. Réessaie plus tard." };
    case "rdv_invalid":
      return { error: "Ce créneau n'est plus disponible. Choisis-en un autre.", slotTaken: true };
    default:
      return { error: RDV_FALLBACK };
  }
}
