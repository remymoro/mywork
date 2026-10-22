import type { Email } from "./email";
import { GUEST_ROLES, REASONS, formatLongDate, formatTime, isGuestRole, isReason } from "./rdv";

/** Un rendez-vous tel que le décrit la base (`rdv_describe`). `owner_email` : e-mail de contact du profil. */
export type RdvDescription = {
  id: string;
  token: string;
  status: "confirmed" | "cancelled";
  starts_at: string;
  ends_at: string;
  duration_min: number;
  guest_first: string;
  guest_last: string;
  guest_email: string;
  message: string;
  /** Vides pour les rendez-vous pris avant l'ajout du rôle et du motif. */
  guest_role: string | null;
  reason: string | null;
  guest_company: string;
  owner_username: string;
  owner_name: string;
  owner_email: string | null;
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** « vendredi 23 octobre 2026 à 09:30 (heure de Paris), 30 min ». */
export function whenText(a: Pick<RdvDescription, "starts_at" | "duration_min">) {
  return `${formatLongDate(a.starts_at)} à ${formatTime(a.starts_at)} (heure de Paris), ${a.duration_min} min`;
}

const guestName = (a: RdvDescription) => `${a.guest_first} ${a.guest_last}`;

function build(to: string, subject: string, lines: string[], action?: { label: string; url: string }): Email {
  const text = [...lines, ...(action ? ["", `${action.label} : ${action.url}`] : []), "", "— MyWork"].join("\n");
  const html =
    `<div style="font-family:system-ui,sans-serif;max-width:32rem;line-height:1.5;color:#040A0E">` +
    lines.map((l) => (l === "" ? "<br>" : `<p style="margin:0 0 8px">${escapeHtml(l)}</p>`)).join("") +
    (action
      ? `<p style="margin:16px 0"><a href="${escapeHtml(action.url)}" style="background:#911128;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">${escapeHtml(action.label)}</a></p>`
      : "") +
    `<p style="color:#6b6b6b;font-size:13px">— MyWork</p></div>`;
  return { to, subject, text, html };
}

/** Lien privé du visiteur pour consulter, reporter ou annuler. */
export const manageUrl = (origin: string, token: string) => `${origin}/rdv/${token}`;

export function confirmationForGuest(a: RdvDescription, origin: string): Email {
  return build(
    a.guest_email,
    `Rendez-vous confirmé avec ${a.owner_name}`,
    [
      `Bonjour ${a.guest_first},`,
      `Ton rendez-vous avec ${a.owner_name} est confirmé :`,
      whenText(a),
      "",
      "Un empêchement ? Tu peux le reporter ou l'annuler avec ce lien personnel.",
    ],
    { label: "Gérer mon rendez-vous", url: manageUrl(origin, a.token) },
  );
}

export function newBookingForOwner(a: RdvDescription, origin: string): Email | null {
  if (!a.owner_email) return null;
  return build(
    a.owner_email,
    `Nouveau rendez-vous : ${guestName(a)}`,
    [
      `${guestName(a)} (${a.guest_email}) a réservé un rendez-vous :`,
      whenText(a),
      ...(isGuestRole(a.guest_role) ? [`Rôle : ${GUEST_ROLES[a.guest_role]}`] : []),
      ...(a.guest_company ? [`Entreprise : ${a.guest_company}`] : []),
      ...(isReason(a.reason) ? [`Motif : ${REASONS[a.reason]}`] : []),
      ...(a.message ? ["", `Message : ${a.message}`] : []),
    ],
    { label: "Voir mes rendez-vous", url: `${origin}/dashboard/rendez-vous` },
  );
}

/** Annulation : l'autre partie est prévenue (le visiteur si c'est le propriétaire qui annule, et inversement). */
export function cancellationEmail(a: RdvDescription, by: "guest" | "owner", origin: string): Email | null {
  if (by === "guest") {
    if (!a.owner_email) return null;
    return build(a.owner_email, `Rendez-vous annulé : ${guestName(a)}`, [
      `${guestName(a)} a annulé son rendez-vous prévu :`,
      whenText(a),
      "Le créneau est de nouveau disponible.",
    ], { label: "Voir mes rendez-vous", url: `${origin}/dashboard/rendez-vous` });
  }
  return build(a.guest_email, `Rendez-vous annulé par ${a.owner_name}`, [
    `Bonjour ${a.guest_first},`,
    `${a.owner_name} a dû annuler votre rendez-vous prévu :`,
    whenText(a),
    "Tu peux choisir un autre créneau sur sa page.",
  ], { label: "Choisir un autre créneau", url: `${origin}/${a.owner_username}?onglet=rdv` });
}

/** Report : l'ancien créneau est libéré, l'autre partie est prévenue. */
export function rescheduleEmail(
  before: RdvDescription,
  after: RdvDescription,
  by: "guest" | "owner",
  origin: string,
): Email | null {
  const lines = [`Ancien créneau : ${whenText(before)}`, `Nouveau créneau : ${whenText(after)}`];
  if (by === "guest") {
    if (!after.owner_email) return null;
    return build(after.owner_email, `Rendez-vous reporté : ${guestName(after)}`, [
      `${guestName(after)} a reporté son rendez-vous.`,
      ...lines,
    ], { label: "Voir mes rendez-vous", url: `${origin}/dashboard/rendez-vous` });
  }
  return build(after.guest_email, `Rendez-vous reporté par ${after.owner_name}`, [
    `Bonjour ${after.guest_first},`,
    `${after.owner_name} a déplacé votre rendez-vous.`,
    ...lines,
  ], { label: "Gérer mon rendez-vous", url: manageUrl(origin, after.token) });
}
