"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom, RoomAudioRenderer, StartAudio, VideoTrack, isTrackReference,
  useLocalParticipant, usePreviewTracks, useTracks,
} from "@livekit/components-react";
import { ConnectionError, ConnectionErrorReason, DisconnectReason, Track } from "livekit-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatLongDate, formatTime } from "@/lib/rdv";
import { visioOpensAt, visioState, type VisioAppointment, type VisioInput } from "@/lib/visio";
import { useVisioClock } from "./use-visio-clock";

type Connection = { token: string; serverUrl: string; endsAt: string; serverNow: string };
type Devices = { audio: boolean; video: boolean };

function deviceMessage(error: unknown) {
  const name = error && typeof error === "object" && "name" in error ? error.name : "";
  if (["NotAllowedError", "PermissionDenied", "SecurityError"].includes(String(name))) {
    return "L’accès au micro ou à la caméra est refusé. Autorise-le dans les réglages de ton navigateur, puis réessaie. Tu peux aussi rejoindre sans ces appareils.";
  }
  if (["NotFoundError", "DevicesNotFoundError", "NotFound"].includes(String(name))) {
    return "Aucun micro ou caméra disponible. Branche un appareil, puis réessaie, ou rejoins sans l’activer.";
  }
  return "Impossible d’utiliser le micro ou la caméra. Vérifie qu’une autre application ne l’utilise pas, puis réessaie.";
}

export function VisioSession({ input, appointment, nowIso }: {
  input: VisioInput;
  appointment: VisioAppointment;
  nowIso: string;
}) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [clockAnchor, setClockAnchor] = useState(nowIso);
  const [devices, setDevices] = useState<Devices>({ audio: false, video: false });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<"ended" | "cancelled" | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const now = useVisioClock(clockAnchor);
  const state = blocked ?? visioState({ ...appointment, ends_at: connection?.endsAt ?? appointment.ends_at }, now);
  const onDeviceError = useCallback((error: unknown) => setError(deviceMessage(error)), []);
  const onRoomError = useCallback((error: Error) => {
    // Connexion annulée par le navigateur lui-même (on quitte, ou double montage de React en développement) : pas une panne.
    if (error instanceof ConnectionError && error.reason === ConnectionErrorReason.Cancelled) return;
    if (["NotAllowedError", "NotFoundError", "NotReadableError", "OverconstrainedError", "SecurityError"].includes(error.name)) {
      setError(deviceMessage(error));
      return;
    }
    setConnection(null);
    setError("La connexion à la visio a échoué. Réessaie pour obtenir un nouvel accès.");
  }, []);
  const onMediaDeviceFailure = useCallback((failure?: string) => setError(deviceMessage({ name: failure })), []);
  const onDisconnected = useCallback((reason?: DisconnectReason) => {
    // Déconnexion voulue côté navigateur (bouton « Quitter », démontage) : rien à signaler.
    if (reason === DisconnectReason.CLIENT_INITIATED) return;
    setConnection(null);
    setNotice("L’appel est déconnecté. Tu peux le rejoindre si le rendez-vous est encore en cours. Un autre appareil utilisant le même lien remplace la connexion précédente.");
  }, []);
  const leave = useCallback(() => { setConnection(null); setNotice("Tu as quitté la visio."); }, []);
  useEffect(() => () => requestRef.current?.abort(), []);

  const join = async (choices: Devices) => {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/visio/token", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input), cache: "no-store", signal: controller.signal,
      });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if (result.code === "ended" || result.code === "cancelled") setBlocked(result.code);
        setError(result.error ?? "Impossible de rejoindre la visio. Réessaie.");
        return;
      }
      setDevices(choices);
      setClockAnchor(result.serverNow);
      setConnection(result);
    } catch {
      if (!controller.signal.aborted) setError("La connexion à la visio a échoué. Vérifie ta connexion Internet, puis réessaie.");
    } finally {
      if (!controller.signal.aborted) setPending(false);
      requestRef.current = null;
    }
  };

  if (state === "waiting") {
    const opensAt = new Date(visioOpensAt(appointment.starts_at)).toISOString();
    return <p role="status" className="rounded-xl border bg-card p-5">La visio ouvrira le {formatLongDate(opensAt)} à {formatTime(opensAt)}, heure de Paris. Tu pourras alors préparer ton micro et ta caméra.</p>;
  }
  if (state !== "open") {
    // Démonter LiveKitRoom déconnecte l'appel et arrête ses pistes locales.
    return <p role="status" className="rounded-xl border bg-card p-5">{state === "cancelled" ? "Rendez-vous annulé" : state === "ended" ? "Rendez-vous terminé" : "Ce rendez-vous ne permet pas de rejoindre une visio."}</p>;
  }

  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm text-muted-foreground">Fin du rendez-vous à {formatTime(connection?.endsAt ?? appointment.ends_at)}, heure de Paris.</p>
      {error && <Alert role="alert" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      {connection ? (
        <LiveKitRoom
          token={connection.token} serverUrl={connection.serverUrl}
          audio={devices.audio} video={devices.video} connect
          onError={onRoomError}
          onMediaDeviceFailure={onMediaDeviceFailure}
          onDisconnected={onDisconnected}
        >
          <Call onDeviceError={onDeviceError} onLeave={leave} />
        </LiveKitRoom>
      ) : <Preparation pending={pending} onJoin={join} onDeviceError={onDeviceError} />}
    </div>
  );
}

function Preparation({ pending, onJoin, onDeviceError }: {
  pending: boolean;
  onJoin: (devices: Devices) => Promise<void>;
  onDeviceError: (error: unknown) => void;
}) {
  const [audio, setAudio] = useState(false);
  const [video, setVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioError = useCallback((error: Error) => { setAudio(false); onDeviceError(error); }, [onDeviceError]);
  const videoError = useCallback((error: Error) => { setVideo(false); onDeviceError(error); }, [onDeviceError]);
  // Séparés : une caméra absente n'empêche pas de tester le micro.
  const audioTracks = usePreviewTracks({ audio, video: false }, audioError);
  const videoTracks = usePreviewTracks({ audio: false, video }, videoError);
  useEffect(() => {
    const track = videoTracks?.find((t) => t.kind === Track.Kind.Video);
    const element = videoRef.current;
    if (!video || !track || !element) return;
    track.attach(element);
    return () => { track.detach(element); };
  }, [videoTracks, video]);

  return (
    <section aria-label="Préparation des appareils" className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="font-heading text-2xl">Prépare ta visio</h2>
      <p className="text-sm text-muted-foreground">Active ton micro et, si tu le souhaites, ta caméra pour les tester. Tu peux aussi rejoindre sans les activer. Aucun appel n’est enregistré.</p>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        {video ? <video ref={videoRef} aria-label="Aperçu de ta caméra" autoPlay muted playsInline className="size-full object-cover" /> : <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Caméra désactivée</p>}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={audio} disabled={pending} onChange={(e) => setAudio(e.target.checked)} className="accent-primary" />Activer le micro</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={video} disabled={pending} onChange={(e) => setVideo(e.target.checked)} className="accent-primary" />Activer la caméra</label>
      </div>
      {audio && audioTracks?.length ? <p role="status" className="text-sm text-muted-foreground">Micro prêt.</p> : null}
      <Button disabled={pending} onClick={() => void onJoin({ audio, video })}>{pending ? "Connexion…" : "Rejoindre la visio"}</Button>
    </section>
  );
}

function Call({ onLeave, onDeviceError }: { onLeave: () => void; onDeviceError: (error: unknown) => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const [pending, setPending] = useState(false);
  const toggle = async (kind: "audio" | "video") => {
    setPending(true);
    try {
      if (kind === "audio") await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      else await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (error) { onDeviceError(error); }
    finally { setPending(false); }
  };
  return (
    <section aria-label="Appel visio" className="space-y-4">
      <RoomAudioRenderer />
      <StartAudio label="Activer le son de l’appel" className={buttonVariants({ variant: "outline" })} />
      {tracks.length < 2 && <p role="status" className="text-sm text-muted-foreground">En attente de l’autre participant…</p>}
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        {tracks.map((track) => (
          <div key={track.participant.identity} className="overflow-hidden rounded-xl border bg-card">
            <div className="aspect-video bg-muted">
              {isTrackReference(track) && !track.publication.isMuted ? <VideoTrack trackRef={track} className="size-full object-cover" /> : <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Caméra désactivée</p>}
            </div>
            <p className="px-3 py-2 text-sm">{track.participant.isLocal ? "Toi" : "Ton interlocuteur"}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={pending} aria-pressed={isMicrophoneEnabled} onClick={() => void toggle("audio")}>{isMicrophoneEnabled ? "Couper le micro" : "Activer le micro"}</Button>
        <Button variant="outline" disabled={pending} aria-pressed={isCameraEnabled} onClick={() => void toggle("video")}>{isCameraEnabled ? "Couper la caméra" : "Activer la caméra"}</Button>
        <Button variant="destructive" onClick={onLeave}>Quitter la visio</Button>
      </div>
    </section>
  );
}
