import { describe, expect, it } from "vitest";
import {
  cancellationEmail,
  confirmationForGuest,
  newBookingForOwner,
  rescheduleEmail,
  type RdvDescription,
} from "./rdv-emails";

const ORIGIN = "https://mywork.website";
const appointment: RdvDescription = {
  id: "a1",
  token: "tok-123",
  status: "confirmed",
  starts_at: "2026-10-23T07:30:00Z", // vendredi 23 octobre, 09:30 à Paris
  ends_at: "2026-10-23T08:00:00Z",
  duration_min: 30,
  guest_first: "Camille",
  guest_last: "Laurent",
  guest_email: "camille@exemple.fr",
  message: "Bonjour <b>vous</b>",
  guest_role: "recruiter",
  reason: "job",
  guest_company: "Talentis",
  owner_username: "claire",
  owner_name: "Claire Moreau",
  owner_email: "claire@exemple.fr",
};

describe("e-mails de rendez-vous", () => {
  it("confirme au visiteur, avec la date en heure de Paris et le lien privé", () => {
    const mail = confirmationForGuest(appointment, ORIGIN);
    expect(mail.to).toBe("camille@exemple.fr");
    expect(mail.text).toContain("vendredi 23 octobre 2026 à 09:30 (heure de Paris), 30 min");
    expect(mail.text).toContain("https://mywork.website/rdv/tok-123");
    expect(mail.text).toContain("Rejoindre la visio (10 min avant) : https://mywork.website/rdv/tok-123/visio");
    expect(mail.html).toContain('href="https://mywork.website/rdv/tok-123/visio"');
  });

  it("prévient le propriétaire d'une réservation, message du visiteur échappé en HTML", () => {
    const mail = newBookingForOwner(appointment, ORIGIN)!;
    expect(mail.to).toBe("claire@exemple.fr");
    expect(mail.subject).toContain("Camille Laurent");
    expect(mail.html).not.toContain("<b>vous</b>");
    expect(mail.html).toContain("&lt;b&gt;vous&lt;/b&gt;");
    expect(mail.text).toContain("Message : Bonjour <b>vous</b>");
    expect(mail.text).toContain("Rôle : Recruteur");
    expect(mail.text).toContain("Entreprise : Talentis");
    expect(mail.text).toContain("Motif : Offre d'emploi");
    expect(mail.text).toContain("https://mywork.website/dashboard/rendez-vous/a1/visio");
    expect(mail.html).toContain('href="https://mywork.website/dashboard/rendez-vous/a1/visio"');
  });

  it("n'écrit ni rôle ni motif pour un ancien rendez-vous qui n'en a pas", () => {
    const mail = newBookingForOwner({ ...appointment, guest_role: null, reason: null, guest_company: "" }, ORIGIN)!;
    expect(mail.text).not.toMatch(/Rôle|Motif|Entreprise/);
  });

  it("n'écrit pas au propriétaire sans e-mail de contact", () => {
    const noEmail = { ...appointment, owner_email: null };
    expect(newBookingForOwner(noEmail, ORIGIN)).toBeNull();
    expect(cancellationEmail(noEmail, "guest", ORIGIN)).toBeNull();
  });

  it("annulation : l'autre partie est prévenue", () => {
    expect(cancellationEmail(appointment, "guest", ORIGIN)!.to).toBe("claire@exemple.fr");
    const byOwner = cancellationEmail(appointment, "owner", ORIGIN)!;
    expect(byOwner.to).toBe("camille@exemple.fr");
    expect(byOwner.text).toContain("https://mywork.website/claire?onglet=rdv");
  });

  it("report : ancien et nouveau créneaux, l'autre partie est prévenue", () => {
    const after = { ...appointment, starts_at: "2026-10-23T12:00:00Z", ends_at: "2026-10-23T12:30:00Z" };
    const byGuest = rescheduleEmail(appointment, after, "guest", ORIGIN)!;
    expect(byGuest.to).toBe("claire@exemple.fr");
    expect(byGuest.text).toContain("Ancien créneau : vendredi 23 octobre 2026 à 09:30");
    expect(byGuest.text).toContain("Nouveau créneau : vendredi 23 octobre 2026 à 14:00");
    expect(byGuest.html).toContain('href="https://mywork.website/dashboard/rendez-vous/a1/visio"');
    const byOwner = rescheduleEmail(appointment, after, "owner", ORIGIN)!;
    expect(byOwner.to).toBe("camille@exemple.fr");
    expect(byOwner.text).toContain("/rdv/tok-123");
    expect(byOwner.html).toContain('href="https://mywork.website/rdv/tok-123/visio"');
  });

  it("les e-mails de visio ne contiennent que des liens MyWork, et jamais de jeton LiveKit", () => {
    const emails = [confirmationForGuest(appointment, ORIGIN), newBookingForOwner(appointment, ORIGIN)!, rescheduleEmail(appointment, appointment, "guest", ORIGIN)!, rescheduleEmail(appointment, appointment, "owner", ORIGIN)!];
    for (const mail of emails) {
      expect(mail.text).not.toMatch(/livekit|wss:|access_token|eyJ/i);
      expect(mail.html).not.toMatch(/livekit|wss:|access_token|eyJ/i);
    }
    expect(cancellationEmail(appointment, "guest", ORIGIN)!.html).not.toContain("/visio");
    expect(cancellationEmail(appointment, "owner", ORIGIN)!.html).not.toContain("/visio");
  });
});
