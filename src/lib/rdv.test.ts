import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOURS,
  addDays,
  addMonth,
  availableDays,
  formatTime,
  horizonEnd,
  isoWeekday,
  monthInWindow,
  parisDay,
  parisInstant,
  slotsForDay,
  validateBooking,
  validateDurations,
  validateHours,
  type RdvConfig,
  appointmentReference,
} from "./rdv";

const config = (over: Partial<RdvConfig> = {}): RdvConfig => ({
  durations: [30, 60],
  hours: DEFAULT_HOURS,
  exceptions: [],
  busy: [],
  ...over,
});

// Jeudi 22 octobre 2026, 10 h à Paris (heure d'été jusqu'au 25 octobre : UTC+2).
const NOW = new Date("2026-10-22T08:00:00Z");

describe("heure de Paris", () => {
  it("convertit un jour et une heure de Paris en instant, été comme hiver", () => {
    expect(parisInstant("2026-10-23", "09:00").toISOString()).toBe("2026-10-23T07:00:00.000Z");
    expect(parisInstant("2026-11-03", "09:00").toISOString()).toBe("2026-11-03T08:00:00.000Z");
    expect(parisInstant("2026-10-25", "14:00").toISOString()).toBe("2026-10-25T13:00:00.000Z");
  });

  it("retrouve le jour et l'heure à Paris", () => {
    expect(parisDay(new Date("2026-10-22T22:30:00Z"))).toBe("2026-10-23");
    expect(formatTime("2026-10-23T07:30:00Z")).toBe("09:30");
  });

  it("calcule le jour de la semaine et les décalages de dates", () => {
    expect(isoWeekday("2026-10-22")).toBe(4);
    expect(isoWeekday("2026-10-25")).toBe(7);
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("slotsForDay", () => {
  it("découpe les horaires par défaut en créneaux de 30 min, matin et après-midi", () => {
    const slots = slotsForDay(config(), 30, "2026-10-23", NOW).map(formatTime);
    expect(slots).toEqual([
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    ]);
  });

  it("ne laisse entrer que des créneaux qui tiennent entièrement dans la plage", () => {
    expect(slotsForDay(config(), 60, "2026-10-23", NOW).map(formatTime)).toEqual([
      "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00",
    ]);
  });

  it("n'offre rien le week-end ni pour une durée non proposée", () => {
    expect(slotsForDay(config(), 30, "2026-10-24", NOW)).toEqual([]);
    expect(slotsForDay(config(), 15, "2026-10-23", NOW)).toEqual([]);
  });

  it("applique le préavis de 4 heures", () => {
    // Aujourd'hui jeudi, il est 10 h : le premier créneau possible est 14 h.
    expect(slotsForDay(config(), 30, "2026-10-22", NOW).map(formatTime)[0]).toBe("14:00");
    const lateMorning = new Date("2026-10-22T09:00:00Z"); // 11 h à Paris
    expect(slotsForDay(config(), 30, "2026-10-22", lateMorning).map(formatTime)[0]).toBe("15:00");
  });

  it("applique l'horizon de 2 mois", () => {
    expect(slotsForDay(config(), 30, "2026-12-22", NOW).length).toBeGreaterThan(0);
    expect(slotsForDay(config(), 30, "2026-12-23", NOW)).toEqual([]);
  });

  it("compte « 2 mois » comme la base en fin de mois : le 31 décembre mène au 28 février", () => {
    expect(horizonEnd(new Date("2026-12-31T10:00:00Z")).toISOString()).toBe("2027-02-28T10:00:00.000Z");
    expect(horizonEnd(new Date("2026-10-22T08:00:00Z")).toISOString()).toBe("2026-12-22T08:00:00.000Z");
  });

  it("retire les créneaux occupés, y compris ceux qui chevauchent un rendez-vous", () => {
    const busy = [{ start: "2026-10-23T08:00:00Z", end: "2026-10-23T09:00:00Z" }]; // 10 h – 11 h
    const slots = slotsForDay(config({ busy }), 30, "2026-10-23", NOW).map(formatTime);
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
    expect(slots).toContain("09:30");
    expect(slots).toContain("11:00");
    const hour = slotsForDay(config({ busy }), 60, "2026-10-23", NOW).map(formatTime);
    expect(hour).not.toContain("10:00");
    expect(hour).toContain("09:00");
  });

  it("respecte une exception : jour fermé, ou horaires particuliers", () => {
    const closed = config({ exceptions: [{ day: "2026-10-23", start: null, end: null }] });
    expect(slotsForDay(closed, 30, "2026-10-23", NOW)).toEqual([]);
    const special = config({ exceptions: [{ day: "2026-10-23", start: "16:00", end: "17:00" }] });
    expect(slotsForDay(special, 30, "2026-10-23", NOW).map(formatTime)).toEqual(["16:00", "16:30"]);
    const weekend = config({ exceptions: [{ day: "2026-10-24", start: "10:00", end: "11:00" }] });
    expect(slotsForDay(weekend, 30, "2026-10-24", NOW).map(formatTime)).toEqual(["10:00", "10:30"]);
  });

  it("reste juste sur une plage qui traverse le passage à l'heure d'hiver (nuit du 25 octobre)", () => {
    const night = config({ exceptions: [{ day: "2026-10-25", start: "01:00", end: "04:00" }] });
    const slots = slotsForDay(night, 60, "2026-10-25", NOW);
    expect(slots[0]).toBe("2026-10-24T23:00:00.000Z"); // 1 h à Paris (UTC+2)
    expect(slots.at(-1)).toBe("2026-10-25T02:00:00.000Z"); // 3 h à Paris (UTC+1)
    expect([...slots].sort()).toEqual(slots);
    // Aucun créneau à cheval sur le changement : chacun dure bien 1 h à l'horloge de Paris.
    for (const iso of slots) {
      const end = new Date(Date.parse(iso) + 3600_000).toISOString();
      expect(Number(formatTime(end).slice(0, 2)) - Number(formatTime(iso).slice(0, 2))).toBe(1);
    }
  });

  it("garde l'heure de Paris le jour du changement d'heure", () => {
    const slots = slotsForDay(config(), 30, "2026-10-26", NOW);
    expect(slots[0]).toBe("2026-10-26T08:00:00.000Z"); // 9 h à Paris, UTC+1 après le 25 octobre
  });
});

describe("calendrier", () => {
  it("liste les jours réservables d'un mois", () => {
    const days = availableDays(config(), 30, "2026-10", NOW);
    expect(days.has("2026-10-22")).toBe(true);
    expect(days.has("2026-10-21")).toBe(false);
    expect(days.has("2026-10-24")).toBe(false);
    expect(days.has("2026-10-26")).toBe(true);
    expect(days.has("2026-10-31")).toBe(false);
  });

  it("dit si un mois est dans la fenêtre réservable", () => {
    expect(monthInWindow("2026-09", NOW)).toBe(false);
    expect(monthInWindow("2026-10", NOW)).toBe(true);
    expect(monthInWindow("2026-12", NOW)).toBe(true);
    expect(monthInWindow("2027-01", NOW)).toBe(false);
  });
});

describe("validateBooking", () => {
  const valid = { first: "Camille", last: "Laurent", email: "camille@exemple.fr", message: "", role: "recruiter", reason: "job", company: "" };
  it("accepte une saisie correcte", () => {
    expect(validateBooking(valid)).toEqual({});
  });
  it("signale les champs manquants ou invalides", () => {
    const errors = validateBooking({ first: " ", last: "", email: "pas-un-email", message: "x".repeat(1001), role: "", reason: "", company: "" });
    expect(Object.keys(errors).sort()).toEqual(["email", "first", "last", "message", "reason", "role"]);
  });
  it("n'accepte que les rôles et motifs de la liste, et une entreprise de 120 caractères au plus", () => {
    expect(validateBooking({ ...valid, role: "patron", reason: "vente" })).toEqual({
      role: "Indique qui tu es.",
      reason: "Choisis le motif du rendez-vous.",
    });
    expect(validateBooking({ ...valid, role: "toString" }).role).toBeDefined();
    expect(validateBooking({ ...valid, company: "x".repeat(121) }).company).toMatch(/120/);
  });
});

describe("appointmentReference", () => {
  it("donne une référence courte et stable", () => {
    const ref = appointmentReference("9a8b7c6d-1111-4222-8333-444455556666");
    expect(ref).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(appointmentReference("9a8b7c6d-1111-4222-8333-444455556666")).toBe(ref);
    expect(appointmentReference("1a8b7c6d-1111-4222-8333-444455556666")).not.toBe(ref);
  });
});

describe("réglages du propriétaire", () => {
  it("valide les horaires par défaut", () => {
    expect(validateHours(DEFAULT_HOURS)).toBeNull();
  });
  it("refuse une plage à l'envers, une heure invalide ou un chevauchement", () => {
    expect(validateHours([{ weekday: 1, start: "12:00", end: "09:00" }])).toMatch(/après/);
    expect(validateHours([{ weekday: 1, start: "25:00", end: "26:00" }])).toMatch(/invalide/);
    expect(validateHours([{ weekday: 8, start: "09:00", end: "10:00" }])).toMatch(/invalide/);
    expect(validateHours([{ weekday: 1, start: "09:02", end: "10:00" }])).toMatch(/multiples de 5/);
    expect(
      validateHours([
        { weekday: 1, start: "09:00", end: "12:00" },
        { weekday: 1, start: "11:00", end: "13:00" },
      ]),
    ).toMatch(/chevauchent/);
  });
  it("valide les durées proposées", () => {
    expect(validateDurations([30, 60])).toBeNull();
    expect(validateDurations([])).toMatch(/au moins/);
    expect(validateDurations([45])).toMatch(/15, 30 ou 60/);
  });
});
