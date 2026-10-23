import { describe, expect, it } from "vitest";
import {
  appointmentCard, buildDashboardData, groupAppointmentsByParisDay, parisWeekBounds,
  profileCompleteness, relativeAppointmentLabel, summarizeKanban,
  type AppointmentRow, type DashboardInput, type DashboardProfile, type DashboardResult,
} from "./dashboard";
import { DEFAULT_STORAGE_LIMIT_BYTES } from "./drive";

const now = Date.parse("2026-10-23T10:00:00Z");
const profile: DashboardProfile = { username: "remy", display_name: null, is_online: true };
const emptyPresence = { experiences: [], projects: [] };
const row: AppointmentRow = {
  id: "rdv-1", status: "confirmed", starts_at: "2026-10-23T12:00:00Z", ends_at: "2026-10-23T12:30:00Z",
  duration_min: 30, guest_first: " Alice ", guest_last: " Martin ", guest_company: " ACME ", guest_role: "recruiter", reason: "job",
};
function ok(data: null, count?: number): DashboardResult<never>;
function ok<T>(data: T, count?: number): DashboardResult<T>;
function ok<T>(data: T | null, count?: number): DashboardResult<T> { return { data, error: null, count }; }
const failure = { data: null, error: { message: "Détail interne à ne pas afficher" } };
function input(): DashboardInput {
  return {
    now, origin: "http://localhost:3000/", profile: { ...profile },
    next: ok(null), week: ok([], 0), settings: ok(null), experiences: ok([]), projects: ok([]),
    boards: ok([]), lists: ok([]), cards: ok([]), files: ok(null, 0), publicFiles: ok(null, 0), storage: ok([]),
  };
}

describe("profileCompleteness", () => {
  it("compte huit repères égaux, ignore les espaces et propose la première amélioration", () => {
    const result = profileCompleteness({ ...profile, display_name: "  ", headline: "\n", skills: [" "] }, emptyPresence);
    expect(result).toMatchObject({ completed: 0, total: 8, percent: 0, label: "0/8 repères renseignés", suggestion: { label: "Ajoute ton nom", href: "/dashboard/profil#section-en-tete" } });
    expect(result.missing).toHaveLength(8);
  });
  it("un profil complet atteint 8/8, en ligne comme hors ligne", () => {
    const complete = { ...profile, display_name: "Rémy", headline: "Consultant", avatar_url: "/avatar", location: "Paris", about: "Présentation", github_url: "https://github.com/example", top_skills: ["Conseil"] };
    const presence = { experiences: [{ is_visible: true }], projects: [{ is_visible: true }] };
    const result = profileCompleteness(complete, presence);
    expect(result).toMatchObject({ completed: 8, total: 8, percent: 100, missing: [], suggestion: null });
    expect(profileCompleteness({ ...complete, is_online: false }, presence)).toEqual(result);
  });
  it("une expérience et un projet ne donnent qu'un point ; les éléments masqués sont exclus", () => {
    expect(profileCompleteness(profile, { experiences: [{ is_visible: true }], projects: [{ is_visible: true }] }).completed).toBe(1);
    expect(profileCompleteness(profile, { experiences: [{ is_visible: false }], projects: [{ is_visible: false }] }).completed).toBe(0);
    expect(profileCompleteness(profile, { experiences: [], projects: [{ id: "visible-déjà-filtré" }] }).completed).toBe(1);
  });
  it("contact par e-mail ou lien, compétences générales ou clés", () => {
    expect(profileCompleteness({ ...profile, contact_email: "mail@example.test", skills: ["A"] }, emptyPresence).completed).toBe(2);
    expect(profileCompleteness({ ...profile, other_url: "https://example.test", top_skills: ["A"] }, emptyPresence).completed).toBe(2);
  });
});

describe("parisWeekBounds", () => {
  it.each([
    ["2026-10-25T22:59:59Z", "2026-10-18T22:00:00.000Z", "2026-10-25T23:00:00.000Z"],
    ["2026-10-25T23:00:00Z", "2026-10-25T23:00:00.000Z", "2026-11-01T23:00:00.000Z"],
    ["2027-01-01T12:00:00Z", "2026-12-27T23:00:00.000Z", "2027-01-03T23:00:00.000Z"],
    ["2026-03-25T12:00:00Z", "2026-03-22T23:00:00.000Z", "2026-03-29T22:00:00.000Z"],
  ])("borne lundi/dimanche et changement d'année ou d'heure (%s)", (date, startIso, endIso) => {
    expect(parisWeekBounds(Date.parse(date))).toEqual({ startIso, endIso });
  });
  it.each([["2026-03-25T12:00:00Z", 167], ["2026-10-23T12:00:00Z", 169]])("respecte la semaine de %s", (date, hours) => {
    const week = parisWeekBounds(Date.parse(date));
    expect((Date.parse(week.endIso) - Date.parse(week.startIso)) / 3600_000).toBe(hours);
  });
});

describe("relativeAppointmentLabel", () => {
  it("affiche heures exactes, heures/minutes, minutes, en cours et fin exacte", () => {
    expect(relativeAppointmentLabel(row.starts_at, row.ends_at, now)).toBe("Dans 2 h");
    expect(relativeAppointmentLabel(row.starts_at, row.ends_at, now + 20 * 60_000)).toBe("Dans 1 h 40 min");
    expect(relativeAppointmentLabel(row.starts_at, row.ends_at, Date.parse(row.starts_at) - 20 * 60_000)).toBe("Dans 20 min");
    expect(relativeAppointmentLabel(row.starts_at, row.ends_at, Date.parse(row.starts_at))).toBe("En cours");
    expect(relativeAppointmentLabel(row.starts_at, row.ends_at, Date.parse(row.ends_at))).toBe("Terminé");
  });
  it.each([
    ["2026-07-01T21:55:00Z", "2026-07-01T22:05:00Z", "2026-07-01T22:35:00Z", "Demain à 00:05"],
    ["2026-01-01T22:55:00Z", "2026-01-01T23:05:00Z", "2026-01-01T23:35:00Z", "Demain à 00:05"],
    ["2026-03-28T22:50:00Z", "2026-03-29T07:00:00Z", "2026-03-29T07:30:00Z", "Demain à 09:00"],
    ["2026-10-24T21:50:00Z", "2026-10-25T08:00:00Z", "2026-10-25T08:30:00Z", "Demain à 09:00"],
  ])("suit minuit à Paris et l'heure d'été/hiver", (date, start, end, label) => {
    expect(relativeAppointmentLabel(start, end, Date.parse(date))).toBe(label);
  });
  it("affiche la date au-delà de demain", () => {
    expect(relativeAppointmentLabel("2026-10-26T08:00:00Z", "2026-10-26T08:30:00Z", now)).toBe("lundi 26 octobre 2026 à 09:00");
  });
  it.each([["invalide", row.ends_at, now], [row.starts_at, "invalide", now], [row.ends_at, row.starts_at, now], [row.starts_at, row.ends_at, NaN]])("résiste aux dates invalides", (start, end, date) => {
    expect(relativeAppointmentLabel(start, end, date)).toBe("Horaire indisponible");
  });
});

describe("appointmentCard", () => {
  it("prépare tous les textes et n'ouvre pas avant −10 minutes", () => {
    const card = appointmentCard(row, Date.parse(row.starts_at) - 600_001);
    expect(card).toMatchObject({ guestName: "Alice Martin", company: "ACME", contextLabel: "Recruteur · Offre d'emploi", durationLabel: "30 min", joinAction: null });
    expect(card.scheduleLabel).toContain("14:00–14:30 (heure de Paris)");
    expect(card.visioHint).toContain("13:50");
    expect(card.action.href).toBe("/dashboard/rendez-vous");
  });
  it.each([-600_000, 0, 60_000])("autorise Rejoindre à l'ouverture et pendant le rendez-vous (%i)", (offset) => {
    expect(appointmentCard(row, Date.parse(row.starts_at) + offset)).toMatchObject({ joinAction: { label: "Rejoindre", href: "/dashboard/rendez-vous/rdv-1/visio" }, visioHint: null });
  });
  it("retire Rejoindre à la fin exacte et pour un rendez-vous annulé", () => {
    expect(appointmentCard(row, Date.parse(row.ends_at))).toMatchObject({ joinAction: null, relativeLabel: "Terminé" });
    expect(appointmentCard({ ...row, status: "cancelled" }, Date.parse(row.starts_at))).toMatchObject({ joinAction: null, relativeLabel: "Annulé" });
  });
  it("supporte les anciens rendez-vous sans rôle, motif ou entreprise et les horaires invalides", () => {
    expect(appointmentCard({ ...row, guest_role: null, reason: undefined, guest_company: "  " }, now)).toMatchObject({ contextLabel: null, company: null });
    expect(appointmentCard({ ...row, starts_at: "invalide" }, now)).toMatchObject({ joinAction: null, scheduleLabel: "Horaire indisponible", relativeLabel: "Horaire indisponible" });
  });
});

describe("groupAppointmentsByParisDay", () => {
  it("trie les jours, horaires et identifiants, autour de minuit UTC, sans mutation", () => {
    const rows = [
      { ...row, id: "z", starts_at: "2026-10-23T22:30:00Z" },
      { ...row, id: "a", starts_at: "2026-10-23T22:30:00Z" },
      { ...row, id: "b", starts_at: "2026-10-24T00:05:00Z" },
      { ...row, id: "c", starts_at: "2026-10-23T21:59:00Z" },
    ];
    const before = structuredClone(rows);
    rows.forEach(Object.freeze); Object.freeze(rows);
    const groups = groupAppointmentsByParisDay(rows);
    expect(groups.map((day) => [day.day, day.appointments.map((a) => a.id)])).toEqual([["2026-10-23", ["c"]], ["2026-10-24", ["a", "z", "b"]]]);
    expect(rows).toEqual(before);
    expect(groupAppointmentsByParisDay([])).toEqual([]);
  });
  it("trie les deux occurrences de 02 h au retour à l'heure d'hiver", () => {
    const rows = [{ ...row, id: "later", starts_at: "2026-10-25T01:10:00Z" }, { ...row, id: "earlier", starts_at: "2026-10-25T00:50:00Z" }];
    expect(groupAppointmentsByParisDay(rows)[0].appointments.map((a) => a.id)).toEqual(["earlier", "later"]);
  });
});

describe("summarizeKanban", () => {
  it("exclut les listes de fin, inclut les tableaux partagés et signale leur absence", () => {
    const result = summarizeKanban([{ id: "b", name: "B", owner_id: "autre" }, { id: "a", name: "A" }], [{ id: "done", board_id: "a", is_done_list: true }], [
      { id: "1", board_id: "a", list_id: "done" }, { id: "2", board_id: "a", list_id: "todo" }, { id: "3", board_id: "b", list_id: "x" },
    ]);
    expect(result.boardCount).toBe(2);
    expect(result.boards[0]).toMatchObject({ id: "a", cardCount: 1, countLabel: "1 carte hors liste de fin", action: { href: "/dashboard/kanban?tableau=a" } });
    expect(result.boards[1].countLabel).toBe("1 carte — Liste de fin non définie");
  });
  it("garde trois tableaux triés par cartes, nom, identifiant sans modifier les entrées", () => {
    const boards = Object.freeze([{ id: "z", name: "Z" }, { id: "b", name: "A" }, { id: "a", name: "A" }, { id: "busy", name: "Z" }]);
    const cards = [{ id: "1", board_id: "busy", list_id: "x" }];
    const first = summarizeKanban(boards, [], cards);
    expect(first.boards.map((b) => b.id)).toEqual(["busy", "a", "b"]);
    expect(first.boardCount).toBe(4);
    expect(first.boards[1].cardCount).toBe(0);
    expect(summarizeKanban([...boards].reverse(), [], cards)).toEqual(first);
    expect(summarizeKanban([], [], []).boards).toEqual([]);
  });
});

describe("buildDashboardData", () => {
  it("construit chaque état vide, désactive la réservation absente, et fournit l'URL absolue", () => {
    const result = buildDashboardData(input());
    expect(result).toMatchObject({ greeting: "Bonjour remy", generatedAt: new Date(now).toISOString(), refreshAt: new Date(now + 60_000).toISOString(), timeZone: "Europe/Paris", nextAppointment: { state: "ready", data: null }, week: { state: "ready", data: { remainingCount: 0, days: [] } }, booking: { state: "ready", data: { enabled: false, visibilityLabel: "Réservation désactivée" } }, kanban: { state: "ready", data: { boardCount: 0, boards: [] } }, drive: { state: "ready", data: { fileCount: 0, publicFileCount: 0, storage: { state: "ready", data: { usedBytes: 0, limitBytes: DEFAULT_STORAGE_LIMIT_BYTES } } } } });
    expect(result.profile).toMatchObject({ publicUrl: "http://localhost:3000/remy", isOnline: true });
  });
  it.each([
    ["next", "nextAppointment"], ["week", "week"], ["settings", "booking"],
    ["boards", "kanban"], ["lists", "kanban"], ["cards", "kanban"], ["files", "drive"], ["publicFiles", "drive"],
  ] as const)("isole l'erreur de %s et ne la remplace pas par zéro", (source, block) => {
    const result = buildDashboardData({ ...input(), [source]: failure });
    expect(result[block]).toEqual({ state: "error", message: "Informations indisponibles" });
    expect(result.profile.publicUrl).toBe("http://localhost:3000/remy");
    if (block !== "kanban") expect(result.kanban.state).toBe("ready");
    if (block !== "drive") expect(result.drive.state).toBe("ready");
  });
  it.each(["experiences", "projects"] as const)("isole une erreur de complétude (%s)", (source) => {
    const result = buildDashboardData({ ...input(), [source]: failure });
    expect(result.profile.completion.state).toBe("error");
    expect(result.nextAppointment.state).toBe("ready");
  });
  it("garde les compteurs Drive visibles si le stockage échoue", () => {
    expect(buildDashboardData({ ...input(), storage: failure, files: ok(null, 1200) }).drive).toMatchObject({ state: "ready", data: { fileCount: 1200, storage: { state: "error" } } });
  });
  it("un compteur absent est une erreur et non un zéro", () => {
    expect(buildDashboardData({ ...input(), week: ok([]) }).week.state).toBe("error");
    expect(buildDashboardData({ ...input(), files: ok(null) }).drive.state).toBe("error");
    expect(buildDashboardData({ ...input(), storage: ok(null) }).drive).toMatchObject({ state: "ready", data: { storage: { state: "error" } } });
  });
  it("indique le profil hors ligne sans masquer les rendez-vous ni bloquer leur visio", () => {
    const result = buildDashboardData({ ...input(), now: Date.parse(row.starts_at), profile: { ...profile, is_online: false }, next: ok(row), settings: ok({ enabled: true }), publicFiles: ok(null, 2) });
    expect(result.profile.openAction.label).toBe("Ouvrir mon aperçu propriétaire");
    expect(result.profile.visibilityLabel).toContain("ni tes fichiers publics, ni réserver");
    expect(result.booking).toMatchObject({ state: "ready", data: { visibilityLabel: "Réservation inaccessible aux visiteurs : ton profil est hors ligne" } });
    expect(result.nextAppointment).toMatchObject({ state: "ready", data: { joinAction: { label: "Rejoindre" } } });
    expect(result.drive).toMatchObject({ state: "ready", data: { publicFilesLabel: "2 fichiers marqués publics — actuellement inaccessibles aux visiteurs" } });
  });
  it("la réservation désactivée n'empêche pas de rejoindre un rendez-vous confirmé", () => {
    expect(buildDashboardData({ ...input(), now: Date.parse(row.starts_at), next: ok(row), settings: ok({ enabled: false }) }).nextAppointment).toMatchObject({ state: "ready", data: { joinAction: { label: "Rejoindre" } } });
  });
  it("conserve les compteurs exacts indépendamment des trois aperçus", () => {
    const result = buildDashboardData({ ...input(), week: ok([row, { ...row, id: "2" }, { ...row, id: "3" }], 18), boards: ok(Array.from({ length: 600 }, (_, n) => ({ id: String(n), name: `Tableau ${n}` }))), files: ok(null, 2345), publicFiles: ok(null, 1234) });
    expect(result.week).toMatchObject({ state: "ready", data: { remainingCount: 18 } });
    if (result.week.state === "ready") expect(result.week.data.days.flatMap((d) => d.appointments)).toHaveLength(3);
    expect(result.kanban).toMatchObject({ state: "ready", data: { boardCount: 600 } });
    if (result.kanban.state === "ready") expect(result.kanban.data.boards).toHaveLength(3);
    expect(result.drive).toMatchObject({ state: "ready", data: { fileCount: 2345, publicFileCount: 1234 } });
  });
  it("mesure le stockage de tous les buckets, même sans fichier, avec le plafond configuré", () => {
    expect(buildDashboardData({ ...input(), storage: ok([{ bucket_id: "avatars", bytes: "512" }, { bucket_id: "kanban-images", bytes: 512 }]), storageLimitRaw: "2048" }).drive).toMatchObject({ state: "ready", data: { fileCount: 0, storage: { state: "ready", data: { usedBytes: 1024, limitBytes: 2048, percent: 50, label: "1 Ko utilisés sur 2 Ko" } } } });
  });
  it.each([
    ["2026-10-23T11:49:59.500Z", "2026-10-23T11:50:00.000Z"],
    ["2026-10-23T11:59:59.500Z", "2026-10-23T12:00:00.000Z"],
    ["2026-10-23T12:29:59.500Z", "2026-10-23T12:30:00.000Z"],
  ])("prévoit un rafraîchissement à l'ouverture/début/fin", (date, expected) => {
    expect(buildDashboardData({ ...input(), now: Date.parse(date), next: ok(row) }).refreshAt).toBe(expected);
  });
});
