import { describe, expect, it } from "vitest";
import { parseVisioInput, visioIdentity, visioOpensAt, visioRoomName, visioState } from "./visio";

const id = "9a8b7c6d-1111-4222-8333-444455556666";
const a = { id, status: "confirmed", starts_at: "2026-10-23T07:30:00Z", ends_at: "2026-10-23T08:00:00Z" };

describe("règles de visio", () => {
  it("ouvre exactement 10 minutes avant, jusqu'à la fin exclue", () => {
    const opens = visioOpensAt(a.starts_at);
    expect(visioState(a, opens - 1)).toBe("waiting");
    expect(visioState(a, opens)).toBe("open");
    expect(visioState(a, Date.parse(a.starts_at))).toBe("open");
    expect(visioState(a, Date.parse(a.ends_at) - 1)).toBe("open");
    expect(visioState(a, Date.parse(a.ends_at))).toBe("ended");
  });

  it("refuse l'annulation, les statuts inconnus et les dates incohérentes", () => {
    const now = Date.parse(a.starts_at);
    expect(visioState({ ...a, status: "cancelled" }, now)).toBe("cancelled");
    expect(visioState({ ...a, status: "pending" }, now)).toBe("invalid");
    for (const patch of [{ starts_at: "invalide" }, { ends_at: "" }, { ends_at: a.starts_at }]) {
      expect(visioState({ ...a, ...patch }, now)).toBe("invalid");
    }
    expect(visioState(a, NaN)).toBe("invalid");
  });

  it("calcule des instants absolus pendant les changements d'heure", () => {
    for (const starts_at of ["2026-10-25T02:05:00+01:00", "2026-03-29T03:05:00+02:00"]) {
      const start = Date.parse(starts_at);
      const appointment = { ...a, starts_at, ends_at: new Date(start + 30 * 60_000).toISOString() };
      expect(visioOpensAt(starts_at)).toBe(start - 600_000);
      expect(visioState(appointment, start - 600_000)).toBe("open");
    }
  });

  it("attribue une salle stable et deux identités distinctes sans donnée personnelle", () => {
    expect(visioRoomName(id.toUpperCase())).toBe(`rdv-${id}`);
    expect(visioRoomName(id)).not.toBe(visioRoomName("autre"));
    expect(visioIdentity("guest", id)).toBe(`guest:${id}`);
    expect(visioIdentity("owner", id)).toBe(`owner:${id}`);
  });

  it("n'accepte que les deux entrées strictes", () => {
    expect(parseVisioInput({ role: "guest", token: id })).toEqual({ role: "guest", token: id });
    expect(parseVisioInput({ role: "owner", id })).toEqual({ role: "owner", id });
    for (const input of [null, [], "x", { role: "guest", token: "x" }, { role: "guest", token: id, id }, { role: "owner", id, starts_at: a.starts_at }, { role: "admin", id }]) {
      expect(parseVisioInput(input)).toBeNull();
    }
  });
});
