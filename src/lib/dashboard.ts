import {
  addDays, formatLongDate, formatTime, GUEST_ROLES, isGuestRole, isoWeekday,
  isReason, parisDay, parisInstant, REASONS, TIME_ZONE,
} from "@/lib/rdv";
import { visioOpensAt, visioState } from "@/lib/visio";
import { formatSize, storageLimit, totalUsage, usagePercent, type StorageUsageRow } from "@/lib/drive";

export type Action = { label: string; href: string };
export type Block<T> = { state: "ready"; data: T } | { state: "error"; message: string };
export type AppointmentRow = {
  id: string; status: string; starts_at: string; ends_at: string; duration_min: number;
  guest_first: string; guest_last: string; guest_company?: string | null;
  guest_role?: string | null; reason?: string | null;
};
export type AppointmentCard = {
  id: string; guestName: string; company: string | null; contextLabel: string | null;
  scheduleLabel: string; relativeLabel: string; durationLabel: string;
  action: Action; joinAction: Action | null; visioHint: string | null;
};
type Completion = {
  completed: number; total: 8; percent: number; label: string; suggestion: Action | null;
};
export type DashboardData = {
  greeting: string; generatedAt: string; refreshAt: string; timeZone: "Europe/Paris";
  nextAppointment: Block<AppointmentCard | null>;
  week: Block<{
    periodLabel: string; remainingCount: number;
    days: { dayLabel: string; appointments: AppointmentCard[] }[]; action: Action;
  }>;
  booking: Block<{ enabled: boolean; visibilityLabel: string; action: Action }>;
  profile: {
    isOnline: boolean; visibilityLabel: string; publicUrl: string; openAction: Action;
    completion: Block<Completion>; editAction: Action;
  };
  kanban: Block<{
    boardCount: number;
    boards: { id: string; name: string; cardCount: number; countLabel: string; action: Action }[];
    action: Action;
  }>;
  drive: Block<{
    fileCount: number; publicFileCount: number; publicFilesLabel: string;
    storage: Block<{ usedBytes: number; limitBytes: number; percent: number; label: string; help: string }>;
    action: Action;
  }>;
};

export type DashboardProfile = {
  username: string; display_name: string | null; is_online: boolean;
} & Partial<Record<
  "headline" | "avatar_url" | "location" | "about" | "contact_email" |
  "website_url" | "linkedin_url" | "github_url" | "other_url", string | null
>> & { skills?: string[] | null; top_skills?: string[] | null };
type VisibleItem = { id?: string; is_visible?: boolean };
type Presence = { experiences: readonly VisibleItem[]; projects: readonly VisibleItem[] };
export type DashboardBoard = { id: string; name: string; owner_id?: string };
export type DashboardList = { id: string; board_id: string; is_done_list: boolean };
export type DashboardCard = { id: string; board_id: string; list_id: string };
export type DashboardResult<T> = { data: T | null; error: { message: string } | null; count?: number | null };
export type DashboardInput = {
  now: number; origin: string; profile: DashboardProfile; storageLimitRaw?: string;
  next: DashboardResult<AppointmentRow>; week: DashboardResult<AppointmentRow[]>;
  settings: DashboardResult<{ enabled: boolean }>;
  experiences: DashboardResult<VisibleItem[]>; projects: DashboardResult<VisibleItem[]>;
  boards: DashboardResult<DashboardBoard[]>; lists: DashboardResult<DashboardList[]>;
  cards: DashboardResult<DashboardCard[]>;
  files: DashboardResult<unknown>; publicFiles: DashboardResult<unknown>;
  storage: DashboardResult<StorageUsageRow[]>;
};

const ready = <T>(data: T): Block<T> => ({ state: "ready", data });
const unavailable = <T>(): Block<T> => ({ state: "error", message: "Informations indisponibles" });
const rdvAction: Action = { label: "Voir mes rendez-vous", href: "/dashboard/rendez-vous" };
const editAction: Action = { label: "Compléter mon profil", href: "/dashboard/profil" };
const hasText = (text: string | null | undefined) => Boolean(text?.trim());

/** Huit repères indicatifs, indépendants de la publication du profil. */
export function profileCompleteness(profile: DashboardProfile, presence: Presence): Completion & { missing: string[] } {
  const checks: [string, boolean, string, string][] = [
    ["nom", hasText(profile.display_name), "Ajoute ton nom", "en-tete"],
    ["titre", hasText(profile.headline), "Ajoute ton titre professionnel", "en-tete"],
    ["photo", hasText(profile.avatar_url), "Ajoute ta photo", "en-tete"],
    ["localisation", hasText(profile.location), "Indique ta localisation", "coordonnees"],
    ["présentation", hasText(profile.about), "Présente ton parcours", "a-propos"],
    ["contact", [profile.contact_email, profile.website_url, profile.linkedin_url, profile.github_url, profile.other_url].some(hasText), "Ajoute un moyen de contact", "coordonnees"],
    ["compétences", [...(profile.skills ?? []), ...(profile.top_skills ?? [])].some(hasText), "Ajoute tes compétences", "competences"],
    ["expérience ou projet visible", [...presence.experiences, ...presence.projects].some((item) => item.is_visible !== false), "Ajoute une expérience ou un projet visible", "experiences"],
  ];
  const missing = checks.filter(([, present]) => !present);
  const completed = 8 - missing.length;
  return {
    completed, total: 8, percent: Math.round(completed / 8 * 100),
    label: `${completed}/8 repères renseignés`, missing: missing.map(([name]) => name),
    suggestion: missing.length ? { label: missing[0][2], href: `/dashboard/profil#section-${missing[0][3]}` } : null,
  };
}

export function parisWeekBounds(now: number): { startIso: string; endIso: string } {
  const day = parisDay(new Date(now));
  const monday = addDays(day, 1 - isoWeekday(day));
  return { startIso: parisInstant(monday, "00:00").toISOString(), endIso: parisInstant(addDays(monday, 7), "00:00").toISOString() };
}

export function relativeAppointmentLabel(start: string, end: string, now: number): string {
  const s = Date.parse(start), e = Date.parse(end);
  if (![s, e, now].every(Number.isFinite) || e <= s) return "Horaire indisponible";
  if (now >= e) return "Terminé";
  if (now >= s) return "En cours";
  const today = parisDay(new Date(now));
  const day = parisDay(new Date(s));
  if (day === addDays(today, 1)) return `Demain à ${formatTime(start)}`;
  if (day === today) {
    const minutes = Math.ceil((s - now) / 60_000);
    if (minutes < 60) return `Dans ${minutes} min`;
    const hours = Math.floor(minutes / 60), rest = minutes % 60;
    return `Dans ${hours} h${rest ? ` ${rest} min` : ""}`;
  }
  return `${formatLongDate(start)} à ${formatTime(start)}`;
}

export function groupAppointmentsByParisDay(rows: readonly AppointmentRow[]) {
  const groups = new Map<string, AppointmentRow[]>();
  const sorted = [...rows].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id.localeCompare(b.id));
  for (const row of sorted) {
    if (!Number.isFinite(Date.parse(row.starts_at))) continue;
    const day = parisDay(new Date(row.starts_at));
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(row);
  }
  return [...groups].map(([day, appointments]) => ({ day, dayLabel: formatLongDate(appointments[0].starts_at), appointments }));
}

export function appointmentCard(row: AppointmentRow, now: number): AppointmentCard {
  const state = visioState(row, now);
  const valid = Number.isFinite(Date.parse(row.starts_at)) && Number.isFinite(Date.parse(row.ends_at)) && Date.parse(row.ends_at) > Date.parse(row.starts_at);
  return {
    id: row.id, guestName: [row.guest_first.trim(), row.guest_last.trim()].filter(Boolean).join(" ") || "Interlocuteur",
    company: row.guest_company?.trim() || null,
    contextLabel: [isGuestRole(row.guest_role) ? GUEST_ROLES[row.guest_role] : null, isReason(row.reason) ? REASONS[row.reason] : null].filter(Boolean).join(" · ") || null,
    scheduleLabel: valid ? `${formatLongDate(row.starts_at)}, ${formatTime(row.starts_at)}–${formatTime(row.ends_at)} (heure de Paris)` : "Horaire indisponible",
    relativeLabel: row.status === "cancelled" ? "Annulé" : relativeAppointmentLabel(row.starts_at, row.ends_at, now),
    durationLabel: `${row.duration_min} min`, action: rdvAction,
    joinAction: state === "open" ? { label: "Rejoindre", href: `/dashboard/rendez-vous/${encodeURIComponent(row.id)}/visio` } : null,
    visioHint: state === "waiting" ? `Ouvre le ${formatLongDate(new Date(visioOpensAt(row.starts_at)).toISOString())} à ${formatTime(new Date(visioOpensAt(row.starts_at)).toISOString())}` : null,
  };
}

export function summarizeKanban(boards: readonly DashboardBoard[], lists: readonly DashboardList[], cards: readonly DashboardCard[]): Extract<DashboardData["kanban"], { state: "ready" }>["data"] {
  const summaries = boards.map((board) => {
    const done = new Set(lists.filter((list) => list.board_id === board.id && list.is_done_list).map((list) => list.id));
    const cardCount = cards.filter((card) => card.board_id === board.id && !done.has(card.list_id)).length;
    return {
      id: board.id, name: board.name, cardCount,
      countLabel: done.size ? `${cardCount} carte${cardCount === 1 ? "" : "s"} hors liste de fin` : `${cardCount} carte${cardCount === 1 ? "" : "s"} — Liste de fin non définie`,
      action: { label: "Ouvrir le tableau", href: `/dashboard/kanban?tableau=${encodeURIComponent(board.id)}` },
    };
  }).sort((a, b) => b.cardCount - a.cardCount || a.name.localeCompare(b.name, "fr") || a.id.localeCompare(b.id));
  return { boardCount: boards.length, boards: summaries.slice(0, 3), action: { label: "Voir mes tableaux", href: "/dashboard/kanban" } };
}

/** Assemble uniquement des données de session déjà lues ; aucune requête ici. */
export function buildDashboardData(input: DashboardInput): DashboardData {
  const { now, profile } = input;
  const bounds = parisWeekBounds(now);
  const appointments = [...(input.next.error || !input.next.data ? [] : [input.next.data]), ...(input.week.error ? [] : input.week.data ?? [])];
  // Le prochain rafraîchissement tombe au plus tard dans une minute, ou sur une transition visio.
  const transitions = appointments.filter((row) => row.status === "confirmed").flatMap((row) => [visioOpensAt(row.starts_at), Date.parse(row.starts_at), Date.parse(row.ends_at)]).filter((time) => time > now);
  const publicUrl = `${input.origin.replace(/\/$/, "")}/${encodeURIComponent(profile.username)}`;
  const enabled = Boolean(input.settings.data?.enabled);
  const fileCount = input.files.count, publicFileCount = input.publicFiles.count;
  const usedBytes = input.storage.data === null ? null : totalUsage(input.storage.data);
  const limitBytes = storageLimit(input.storageLimitRaw);
  const storage: Extract<DashboardData["drive"], { state: "ready" }>["data"]["storage"] = input.storage.error || usedBytes === null || !Number.isFinite(usedBytes) ? unavailable() : ready({
    usedBytes, limitBytes, percent: usagePercent(usedBytes, limitBytes),
    label: `${formatSize(usedBytes)} utilisés sur ${formatSize(limitBytes)}`,
    help: "Stockage de tout le projet, partagé avec les avatars, les images de projets et les images Kanban.",
  });
  return {
    greeting: `Bonjour ${profile.display_name?.trim() || profile.username}`,
    generatedAt: new Date(now).toISOString(), refreshAt: new Date(Math.min(now + 60_000, ...transitions)).toISOString(), timeZone: TIME_ZONE,
    nextAppointment: input.next.error ? unavailable() : ready(input.next.data ? appointmentCard(input.next.data, now) : null),
    week: input.week.error || input.week.data === null || input.week.count == null ? unavailable() : ready({
      periodLabel: `Du ${formatLongDate(bounds.startIso)} au ${formatLongDate(parisInstant(addDays(parisDay(new Date(bounds.endIso)), -1), "00:00").toISOString())}`,
      remainingCount: input.week.count,
      days: groupAppointmentsByParisDay(input.week.data.slice(0, 3)).map(({ dayLabel, appointments }) => ({ dayLabel, appointments: appointments.map((row) => appointmentCard(row, now)) })),
      action: rdvAction,
    }),
    booking: input.settings.error ? unavailable() : ready({
      enabled, visibilityLabel: !enabled ? "Réservation désactivée" : profile.is_online ? "Réservation activée" : "Réservation inaccessible aux visiteurs : ton profil est hors ligne",
      action: { label: "Gérer mes disponibilités", href: "/dashboard/rendez-vous" },
    }),
    profile: {
      isOnline: profile.is_online,
      visibilityLabel: profile.is_online ? "Profil en ligne" : "Profil hors ligne : les visiteurs ne peuvent consulter ni ton profil, ni tes fichiers publics, ni réserver.",
      publicUrl, openAction: { label: profile.is_online ? "Ouvrir mon profil public" : "Ouvrir mon aperçu propriétaire", href: publicUrl },
      completion: input.experiences.error || input.projects.error || input.experiences.data === null || input.projects.data === null ? unavailable() : ready(profileCompleteness(profile, { experiences: input.experiences.data, projects: input.projects.data })),
      editAction,
    },
    kanban: input.boards.error || input.lists.error || input.cards.error || !input.boards.data || !input.lists.data || !input.cards.data ? unavailable() : ready(summarizeKanban(input.boards.data, input.lists.data, input.cards.data)),
    drive: input.files.error || input.publicFiles.error || fileCount == null || publicFileCount == null ? unavailable() : ready({
      fileCount, publicFileCount,
      publicFilesLabel: `${publicFileCount} fichier${publicFileCount === 1 ? "" : "s"} marqué${publicFileCount === 1 ? "" : "s"} public${publicFileCount === 1 ? "" : "s"}${profile.is_online ? "" : " — actuellement inaccessibles aux visiteurs"}`,
      storage, action: { label: "Gérer mes fichiers", href: "/dashboard/fichiers" },
    }),
  };
}
