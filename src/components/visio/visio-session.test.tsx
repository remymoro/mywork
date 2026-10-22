import { act, fireEvent, render, screen } from "@testing-library/react";
import type { LiveKitRoomProps } from "@livekit/components-react";
import type { CreateLocalTracksOptions } from "livekit-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(), disconnect: vi.fn(), capture: vi.fn(), stop: vi.fn(), attach: vi.fn(), detach: vi.fn(),
  setMicrophoneEnabled: vi.fn(), setCameraEnabled: vi.fn(),
  roomProps: null as LiveKitRoomProps | null,
  audioError: undefined as ((error: Error) => void) | undefined,
  videoError: undefined as ((error: Error) => void) | undefined,
}));
vi.mock("@livekit/components-react", async () => {
  const { useEffect } = await import("react");
  const tracks = [{ kind: "video", attach: mocks.attach, detach: mocks.detach, stop: mocks.stop }];
  return {
    LiveKitRoom: ({ children, ...props }: LiveKitRoomProps) => {
      mocks.roomProps = props;
      // Le SDK déconnecte et arrête les pistes au démontage de LiveKitRoom.
      useEffect(() => () => { mocks.disconnect(); }, []);
      return <div>{children}</div>;
    },
    RoomAudioRenderer: () => <div data-testid="audio-distant" />,
    StartAudio: ({ label }: { label: string }) => <button>{label}</button>,
    VideoTrack: () => <div data-testid="video-distante" />,
    isTrackReference: () => true,
    useTracks: () => [{ participant: { identity: "autre", isLocal: false }, publication: { isMuted: false } }],
    useLocalParticipant: () => ({
      localParticipant: { setMicrophoneEnabled: mocks.setMicrophoneEnabled, setCameraEnabled: mocks.setCameraEnabled },
      isMicrophoneEnabled: false, isCameraEnabled: false,
    }),
    usePreviewTracks: (options: CreateLocalTracksOptions, onError?: (error: Error) => void) => {
      if (options.audio) mocks.audioError = onError;
      if (options.video) mocks.videoError = onError;
      const { audio, video } = options;
      useEffect(() => {
        if (!audio && !video) return;
        mocks.capture({ audio, video });
        return () => mocks.stop();
      }, [audio, video]);
      return options.video ? tracks : options.audio ? [{ kind: "audio", stop: mocks.stop }] : [];
    },
  };
});
import { VisioSession } from "./visio-session";

const appointment = {
  id: "9a8b7c6d-1111-4222-8333-444455556666", status: "confirmed",
  starts_at: "2026-10-23T07:30:00Z", ends_at: "2026-10-23T08:00:00Z",
};
const input = { role: "guest" as const, token: "5b3f0c1e-1111-4222-8333-444455556666" };
const setup = (props: Partial<Parameters<typeof VisioSession>[0]> = {}) => render(
  <VisioSession appointment={appointment} input={input} nowIso={appointment.starts_at} {...props} />,
);
const join = async () => { await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Rejoindre la visio" })); }); };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(appointment.starts_at));
  mocks.roomProps = null;
  mocks.audioError = undefined;
  mocks.videoError = undefined;
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({
    token: "jeton-fictif", serverUrl: "wss://visio.example.test", endsAt: appointment.ends_at, serverNow: appointment.starts_at,
  }) });
  mocks.setMicrophoneEnabled.mockResolvedValue(undefined);
  mocks.setCameraEnabled.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("session visio", () => {
  it("attend l'ouverture en heure de Paris sans demander d'appareils ou de jeton", () => {
    setup({ nowIso: "2026-10-23T07:19:59Z" });
    expect(screen.getByRole("status")).toHaveTextContent("vendredi 23 octobre 2026 à 09:20, heure de Paris");
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole("heading", { name: "Prépare ta visio" })).toBeInTheDocument();
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it("réévalue l'heure au retour dans l'onglet", () => {
    setup({ nowIso: "2026-10-23T07:19:59Z" });
    vi.setSystemTime(new Date("2026-10-23T07:30:01Z"));
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(screen.getByRole("heading", { name: "Prépare ta visio" })).toBeInTheDocument();
  });

  it("prépare caméra et micro séparément et arrête l'aperçu au départ de la page", () => {
    const { unmount } = setup();
    fireEvent.click(screen.getByRole("checkbox", { name: "Activer la caméra" }));
    expect(mocks.capture).toHaveBeenCalledWith({ audio: false, video: true });
    expect(mocks.attach).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Activer le micro" }));
    expect(mocks.capture).toHaveBeenCalledWith({ audio: true, video: false });
    expect(screen.getByText("Micro prêt.")).toBeInTheDocument();
    unmount();
    expect(mocks.stop).toHaveBeenCalledTimes(2);
    expect(mocks.detach).toHaveBeenCalled();
  });

  it.each([
    ["NotAllowedError", "refusé"], ["NotFoundError", "Aucun micro ou caméra"], ["NotReadableError", "autre application"],
  ])("explique l'erreur d'appareil %s et permet de rejoindre sans cet appareil", async (name, message) => {
    setup();
    fireEvent.click(screen.getByRole("checkbox", { name: "Activer la caméra" }));
    act(() => { mocks.videoError?.(new DOMException("détail", name)); });
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("checkbox", { name: "Activer la caméra" })).not.toBeChecked();
    await join();
    expect(mocks.roomProps?.video).toBe(false);
  });

  it("demande le jeton au clic, sans envoyer les appareils ou horaires, puis affiche l'appel", async () => {
    setup();
    fireEvent.click(screen.getByRole("checkbox", { name: "Activer le micro" }));
    await join();
    expect(mocks.fetch).toHaveBeenCalledWith("/api/visio/token", expect.objectContaining({
      method: "POST", body: JSON.stringify(input), cache: "no-store", headers: { "Content-Type": "application/json" },
    }));
    expect(mocks.roomProps).toMatchObject({ token: "jeton-fictif", audio: true, video: false });
    expect(screen.getByRole("region", { name: "Appel visio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activer le son de l’appel" })).toBeInTheDocument();
    expect(screen.getByTestId("audio-distant")).toBeInTheDocument();
    expect(screen.getByTestId("video-distante")).toBeInTheDocument();
    expect(mocks.stop).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Quitter la visio" }));
    expect(mocks.disconnect).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Tu as quitté la visio.");
  });

  it("change les appareils pendant l'appel et explique un refus", async () => {
    setup();
    await join();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Activer le micro" })); });
    expect(mocks.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    mocks.setCameraEnabled.mockRejectedValue(new DOMException("non", "NotAllowedError"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Activer la caméra" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("refusé");
    expect(screen.getByRole("region", { name: "Appel visio" })).toBeInTheDocument();
  });

  it("coupe l'appel à ends_at et arrête les pistes", async () => {
    setup({ nowIso: "2026-10-23T07:59:59Z" });
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({
      token: "jeton-fictif", serverUrl: "wss://visio.example.test", endsAt: appointment.ends_at, serverNow: "2026-10-23T07:59:59Z",
    }) });
    await join();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole("status")).toHaveTextContent("Rendez-vous terminé");
    expect(mocks.disconnect).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Rejoindre la visio" })).not.toBeInTheDocument();
  });

  it("arrête aussi l'aperçu à la fin du rendez-vous", () => {
    setup({ nowIso: "2026-10-23T07:59:59Z" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Activer le micro" }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole("status")).toHaveTextContent("Rendez-vous terminé");
    expect(mocks.stop).toHaveBeenCalled();
  });

  it.each(["cancelled", "ended"])("montre l'état %s dès la page sans appareil ni jeton", (status) => {
    setup({ appointment: { ...appointment, status: status === "cancelled" ? status : "confirmed" }, nowIso: status === "ended" ? appointment.ends_at : appointment.starts_at });
    expect(screen.getByRole("status")).toHaveTextContent(status === "ended" ? "Rendez-vous terminé" : "Rendez-vous annulé");
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("montre le refus serveur et permet de réessayer avec un nouveau jeton", async () => {
    mocks.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Le service de visio est indisponible.", code: "unavailable" }) });
    setup();
    await join();
    expect(screen.getByRole("alert")).toHaveTextContent("indisponible");
    expect(mocks.roomProps).toBeNull();
    await join();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("region", { name: "Appel visio" })).toBeInTheDocument();
  });

  it("prend en compte l'annulation renvoyée au dernier moment", async () => {
    mocks.fetch.mockResolvedValue({ ok: false, json: async () => ({ code: "cancelled", error: "Annulé" }) });
    setup();
    fireEvent.click(screen.getByRole("checkbox", { name: "Activer le micro" }));
    await join();
    expect(screen.getByRole("status")).toHaveTextContent("Rendez-vous annulé");
    expect(mocks.stop).toHaveBeenCalled();
    expect(mocks.roomProps).toBeNull();
  });

  it("explique une panne réseau sans exposer de détail interne", async () => {
    mocks.fetch.mockRejectedValue(new Error("détail interne"));
    setup();
    await join();
    expect(screen.getByRole("alert")).toHaveTextContent("Vérifie ta connexion Internet");
    expect(screen.getByRole("alert")).not.toHaveTextContent("interne");
  });

  it("permet une nouvelle tentative après un échec LiveKit", async () => {
    setup();
    await join();
    act(() => { mocks.roomProps?.onError?.(new Error("détail privé")); });
    expect(screen.getByRole("alert")).toHaveTextContent("nouvel accès");
    expect(mocks.disconnect).toHaveBeenCalled();
    await join();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("garde les callbacks LiveKit stables quand l'horloge avance", async () => {
    setup();
    await join();
    const props = mocks.roomProps;
    act(() => { vi.advanceTimersByTime(1000); });
    expect(mocks.roomProps?.onError).toBe(props?.onError);
    expect(mocks.roomProps?.onDisconnected).toBe(props?.onDisconnected);
    expect(mocks.roomProps?.onMediaDeviceFailure).toBe(props?.onMediaDeviceFailure);
    expect(mocks.disconnect).not.toHaveBeenCalled();
  });

  it("permet de rester dans l'appel si un appareil devient inaccessible à la connexion", async () => {
    setup();
    await join();
    act(() => { mocks.roomProps?.onError?.(Object.assign(new Error(), { name: "NotAllowedError" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("refusé");
    expect(screen.getByRole("region", { name: "Appel visio" })).toBeInTheDocument();
    expect(mocks.disconnect).not.toHaveBeenCalled();
  });
});
