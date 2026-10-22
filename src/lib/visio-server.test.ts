// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(), rpc: vi.fn(), getUser: vi.fn(), from: vi.fn(),
  select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(),
  RoomServiceClient: vi.fn(), createRoom: vi.fn(), AccessToken: vi.fn(), addGrant: vi.fn(), toJwt: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("livekit-server-sdk", () => ({
  AccessToken: mocks.AccessToken, RoomServiceClient: mocks.RoomServiceClient,
  TrackSource: { CAMERA: 1, MICROPHONE: 2, SCREEN_SHARE: 3, SCREEN_SHARE_AUDIO: 4 },
}));
import { getVisioAppointment, issueVisioToken } from "./visio-server";

const id = "9a8b7c6d-1111-4222-8333-444455556666";
const token = "5b3f0c1e-1111-4222-8333-444455556666";
const a = {
  id, owner_id: "proprietaire", status: "confirmed", starts_at: "2026-10-23T07:30:00Z", ends_at: "2026-10-23T08:00:00Z",
  guest_first: "Camille", guest_last: "Laurent", owner_name: "Claire Moreau", guest_email: "camille@exemple.fr",
};
const guest = { role: "guest" as const, token };
const owner = { role: "owner" as const, id };

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T07:20:00Z"));
  vi.stubEnv("LIVEKIT_URL", "wss://visio.example.test");
  vi.stubEnv("LIVEKIT_API_KEY", "cle-fictive");
  vi.stubEnv("LIVEKIT_API_SECRET", "secret-fictif-de-test");
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc, auth: { getUser: mocks.getUser }, from: mocks.from });
  mocks.rpc.mockResolvedValue({ data: a, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: a.owner_id } }, error: null });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: a, error: null });
  mocks.RoomServiceClient.mockImplementation(function () { return { createRoom: mocks.createRoom }; });
  mocks.AccessToken.mockImplementation(function () { return { addGrant: mocks.addGrant, toJwt: mocks.toJwt, ttl: 60 }; });
  mocks.createRoom.mockResolvedValue({});
  mocks.toJwt.mockResolvedValue("jeton-fictif");
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

function noSdk() {
  expect(mocks.RoomServiceClient).not.toHaveBeenCalled();
  expect(mocks.createRoom).not.toHaveBeenCalled();
  expect(mocks.AccessToken).not.toHaveBeenCalled();
  expect(mocks.toJwt).not.toHaveBeenCalled();
}

describe("autorisation et émission visio", () => {
  it("autorise le visiteur via rdv_get, sans retourner les autres données", async () => {
    const data = await getVisioAppointment(guest);
    expect(mocks.rpc).toHaveBeenCalledWith("rdv_get", { p_token: token });
    // Ni e-mail ni code privé : seulement les horaires et les deux noms affichés dans l'appel.
    expect(data).toEqual({
      id, status: a.status, starts_at: a.starts_at, ends_at: a.ends_at,
      self_name: "Camille Laurent", peer_name: "Claire Moreau",
    });
    expect(mocks.getUser).not.toHaveBeenCalled();
    noSdk();
  });

  it("vérifie session, id et propriétaire sous RLS", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: a, error: null }).mockResolvedValueOnce({ data: { display_name: "Claire" }, error: null });
    await issueVisioToken(owner);
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.from).toHaveBeenCalledWith("rdv_appointments");
    expect(mocks.eq.mock.calls).toEqual([["id", id], ["owner_id", a.owner_id], ["id", a.owner_id]]);
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.AccessToken).toHaveBeenCalledWith(expect.any(String), expect.any(String), { identity: `owner:${id}`, name: "Claire", ttl: 60 });
  });

  it("crée une salle à deux et signe seulement les droits caméra et micro pour 60 s", async () => {
    const result = await issueVisioToken(guest);
    expect(mocks.RoomServiceClient).toHaveBeenCalledWith("https://visio.example.test", "cle-fictive", "secret-fictif-de-test");
    expect(mocks.createRoom).toHaveBeenCalledWith({ name: `rdv-${id}`, maxParticipants: 2, emptyTimeout: 300, departureTimeout: 60 });
    expect(mocks.AccessToken).toHaveBeenCalledWith(expect.any(String), expect.any(String), { identity: `guest:${id}`, name: "Camille Laurent", ttl: 60 });
    expect(mocks.addGrant).toHaveBeenCalledWith({
      room: `rdv-${id}`, roomJoin: true, canPublish: true, canSubscribe: true,
      canPublishSources: [1, 2, 3, 4], canPublishData: true, canUpdateOwnMetadata: false,
    });
    expect(mocks.AccessToken.mock.results[0].value.ttl).toBe(Date.now() / 1000 + 60);
    expect(result).toEqual({ token: "jeton-fictif", serverUrl: "wss://visio.example.test", endsAt: a.ends_at, serverNow: new Date().toISOString() });
  });

  it("plafonne l'expiration absolue à ends_at, même avec une latence de création", async () => {
    vi.setSystemTime(new Date("2026-10-23T07:59:30.700Z"));
    mocks.createRoom.mockImplementation(async () => { vi.setSystemTime(new Date("2026-10-23T07:59:40.900Z")); });
    await issueVisioToken(guest);
    expect(mocks.AccessToken.mock.results[0].value.ttl).toBe(Date.parse(a.ends_at) / 1000);
  });

  it.each([
    ["2026-10-23T07:19:59.999Z", "confirmed", "waiting"],
    [a.ends_at, "confirmed", "ended"],
    [a.starts_at, "cancelled", "cancelled"],
    [a.starts_at, "pending", "invalid"],
  ])("refuse %s / %s avant le SDK", async (now, status, code) => {
    vi.setSystemTime(new Date(now));
    mocks.rpc.mockResolvedValue({ data: { ...a, status }, error: null });
    await expect(issueVisioToken(guest)).rejects.toMatchObject({ code });
    noSdk();
  });

  it("refuse un UUID mal formé avant Supabase et le SDK", async () => {
    await expect(issueVisioToken({ role: "guest", token: "faux" })).rejects.toMatchObject({ status: 400 });
    expect(mocks.createClient).not.toHaveBeenCalled();
    noSdk();
  });

  it("refuse un lien inconnu", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(issueVisioToken(guest)).rejects.toMatchObject({ status: 404 });
    noSdk();
  });

  it("refuse l'appel propriétaire direct sans session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(issueVisioToken(owner)).rejects.toMatchObject({ status: 401 });
    expect(mocks.from).not.toHaveBeenCalled();
    noSdk();
  });

  it.each([null, { ...a, owner_id: "autre" }])("refuse le mauvais propriétaire (%s)", async (data) => {
    mocks.maybeSingle.mockResolvedValue({ data, error: null });
    await expect(issueVisioToken(owner)).rejects.toMatchObject({ status: 404 });
    noSdk();
  });

  it.each(["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"])("signale le service indisponible sans %s", async (key) => {
    vi.stubEnv(key, "");
    await expect(issueVisioToken(guest)).rejects.toMatchObject({ status: 503, message: expect.stringContaining("indisponible") });
    noSdk();
  });

  it("masque une erreur Supabase et n'appelle pas LiveKit", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "détail privé" } });
    await expect(issueVisioToken(guest)).rejects.toMatchObject({ code: "unavailable", message: expect.not.stringContaining("privé") });
    noSdk();
  });

  it.each(["createRoom", "toJwt"] as const)("masque la panne LiveKit dans %s", async (method) => {
    mocks[method].mockRejectedValue(new Error("détail interne"));
    await expect(issueVisioToken(guest)).rejects.toMatchObject({ status: 503, message: expect.not.stringContaining("interne") });
    if (method === "createRoom") expect(mocks.AccessToken).not.toHaveBeenCalled();
  });

  it("ne signe pas si la création dépasse la fin du rendez-vous", async () => {
    mocks.createRoom.mockImplementation(async () => { vi.setSystemTime(new Date(a.ends_at)); });
    await expect(issueVisioToken(guest)).rejects.toMatchObject({ code: "ended" });
    expect(mocks.AccessToken).not.toHaveBeenCalled();
  });
});
