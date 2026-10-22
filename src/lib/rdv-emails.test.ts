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
  });

  it("prévient le propriétaire d'une réservation, message du visiteur échappé en HTML", () => {
    const mail = newBookingForOwner(appointment, ORIGIN)!;
    expect(mail.to).toBe("claire@exemple.fr");
    expect(mail.subject).toContain("Camille Laurent");
    expect(mail.html).not.toContain("<b>vous</b>");
    expect(mail.html).toContain("&lt;b&gt;vous&lt;/b&gt;");
    expect(mail.text).toContain("Message : Bonjour <b>vous</b>");
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
    const byOwner = rescheduleEmail(appointment, after, "owner", ORIGIN)!;
    expect(byOwner.to).toBe("camille@exemple.fr");
    expect(byOwner.text).toContain("/rdv/tok-123");
  });
});
