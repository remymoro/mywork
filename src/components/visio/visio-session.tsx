"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  LiveKitRoom, RoomAudioRenderer, StartAudio, VideoTrack, isTrackReference,
  useChat, useLocalParticipant, usePreviewTracks, useTracks,
  type ReceivedChatMessage, type TrackReference, type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { ConnectionError, ConnectionErrorReason, DisconnectReason, Track } from "livekit-client";
import { ArrowUp, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatLongDate, formatTime } from "@/lib/rdv";
import { visioOpensAt, visioState, type VisioAppointment, type VisioInput } from "@/lib/visio";
import { cn } from "@/lib/utils";
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
      {!connection && error && <Alert role="alert" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      {connection ? (
        <LiveKitRoom
          token={connection.token} serverUrl={connection.serverUrl}
          audio={devices.audio} video={devices.video} connect
          onError={onRoomError}
          onMediaDeviceFailure={onMediaDeviceFailure}
          onDisconnected={onDisconnected}
        >
          <Call
            appointment={appointment}
            endsAt={connection.endsAt}
            now={now}
            error={error}
            onDeviceError={onDeviceError}
            onLeave={leave}
          />
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

/** Vérifie qu'une référence de piste possède bien un flux vidéo actif (non coupé). */
function hasActiveVideo(track: TrackReferenceOrPlaceholder | undefined): track is TrackReference {
  return Boolean(track && isTrackReference(track) && track.publication && !track.publication.isMuted);
}

/** Distingue un partage d'écran d'une caméra. */
function isScreenShareTrack(track: TrackReferenceOrPlaceholder): boolean {
  return track.source === Track.Source.ScreenShare || (isTrackReference(track) && track.publication?.source === Track.Source.ScreenShare);
}

/** Détermine si un message de discussion a été envoyé par l'utilisateur local. */
function isOwnMessage(msg: ReceivedChatMessage, localIdentity?: string, selfName?: string): boolean {
  if (typeof msg.from?.isLocal === "boolean") return msg.from.isLocal;
  if (localIdentity && msg.from?.identity) return msg.from.identity === localIdentity;
  if (selfName && msg.from?.name) return msg.from.name === selfName;
  return false;
}

function Call({ appointment, endsAt, now, error, onLeave, onDeviceError }: {
  appointment: VisioAppointment;
  endsAt: string;
  now: number;
  error: string | null;
  onLeave: () => void;
  onDeviceError: (error: unknown) => void;
}) {
  const {
    localParticipant,
    isMicrophoneEnabled = false,
    isCameraEnabled = false,
    isScreenShareEnabled = false,
  } = useLocalParticipant();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  const { chatMessages, isSending, send } = useChat();

  const [pending, setPending] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [seenRemoteCount, setSeenRemoteCount] = useState(0);

  const remoteTracks = tracks.filter((t) => !t.participant.isLocal);
  const remotePresent = remoteTracks.length > 0;
  const remoteScreen = remoteTracks.find((t): t is TrackReference => isScreenShareTrack(t) && hasActiveVideo(t));
  const remoteCamera = remoteTracks.find((t) => !isScreenShareTrack(t));

  const localTracks = tracks.filter((t) => t.participant.isLocal);
  const localCamera = localTracks.find((t) => !isScreenShareTrack(t));
  const localScreen = localTracks.find((t): t is TrackReference => isScreenShareTrack(t) && hasActiveVideo(t));
  const sharingScreen = Boolean(isScreenShareEnabled || localScreen);

  const remoteMessagesCount = chatMessages.filter(
    (m) => !isOwnMessage(m, localParticipant?.identity, appointment.self_name),
  ).length;
  const hasUnread = !chatOpen && remoteMessagesCount > seenRemoteCount;

  const toggleChat = () => {
    setSeenRemoteCount(remoteMessagesCount);
    setChatOpen((open) => !open);
  };

  const closeChat = () => {
    setSeenRemoteCount(remoteMessagesCount);
    setChatOpen(false);
  };

  const toggle = async (kind: "audio" | "video" | "screen") => {
    setPending(true);
    try {
      if (kind === "audio") await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      else if (kind === "video") await localParticipant.setCameraEnabled(!isCameraEnabled);
      else await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (err) {
      const name = err && typeof err === "object" && "name" in err ? String(err.name) : "";
      // Refus volontaire de partager l'écran : ignoré silencieusement.
      if (kind === "screen" && (name === "NotAllowedError" || name === "PermissionDenied")) return;
      onDeviceError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-label="Appel visio" className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <RoomAudioRenderer />

      {/* Barre du haut : identité de l'interlocuteur, heure de fin et horloge courante */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 text-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="font-heading grid size-7 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold leading-none text-primary-foreground"
          >
            M
          </span>
          <p className="truncate">
            <span className="font-medium">{appointment.peer_name}</span>
            <span className="text-muted-foreground"> · Fin prévue à {formatTime(endsAt)}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StartAudio label="Activer le son de l’appel" className={buttonVariants({ variant: "outline", size: "sm" })} />
          <span className="text-muted-foreground tabular-nums">{formatTime(new Date(now).toISOString())}</span>
        </div>
      </header>

      {error && (
        <Alert role="alert" variant="destructive" className="mx-4 mt-3 w-auto shrink-0">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Zone centrale : scène vidéo + panneau de discussion à droite */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <Stage
          peerName={appointment.peer_name}
          remotePresent={remotePresent}
          remoteScreen={remoteScreen}
          remoteCamera={remoteCamera}
          localCamera={localCamera}
          isLocalScreenSharing={sharingScreen}
        />
        {chatOpen && (
          <ChatPanel
            messages={chatMessages}
            isSending={isSending}
            localIdentity={localParticipant?.identity}
            selfName={appointment.self_name}
            peerName={appointment.peer_name}
            onSend={send}
            onClose={closeChat}
          />
        )}
      </div>

      {/* Barre de contrôle du bas */}
      <ControlBar
        pending={pending}
        isMicrophoneEnabled={isMicrophoneEnabled}
        isCameraEnabled={isCameraEnabled}
        isScreenShareEnabled={sharingScreen}
        chatOpen={chatOpen}
        hasUnread={hasUnread}
        onToggle={(kind) => void toggle(kind)}
        onToggleChat={toggleChat}
        onLeave={onLeave}
      />
    </section>
  );
}

/** Scène principale : flux de l'interlocuteur (partage d'écran ou caméra) et incrustation locale. */
function Stage({ peerName, remotePresent, remoteScreen, remoteCamera, localCamera, isLocalScreenSharing }: {
  peerName: string;
  remotePresent: boolean;
  remoteScreen: TrackReference | undefined;
  remoteCamera: TrackReferenceOrPlaceholder | undefined;
  localCamera: TrackReferenceOrPlaceholder | undefined;
  isLocalScreenSharing: boolean;
}) {
  return (
    <div className="relative m-3 flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-foreground sm:m-4">
      {isLocalScreenSharing && (
        <p className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-md border bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-xs">
          Tu partages ton écran
        </p>
      )}

      {remoteScreen ? (
        <VideoTrack trackRef={remoteScreen} className="size-full object-contain" />
      ) : hasActiveVideo(remoteCamera) ? (
        <VideoTrack trackRef={remoteCamera} className="size-full object-cover" />
      ) : (
        <p role="status" className="px-4 text-center text-sm text-background/80">
          {remotePresent ? `Caméra de ${peerName} désactivée` : `En attente de ${peerName}…`}
        </p>
      )}

      <span className="absolute bottom-3 left-3 z-10 max-w-[45%] truncate rounded-md bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground shadow-xs">
        {peerName}
      </span>

      <SelfView track={localCamera} />
    </div>
  );
}

/** Incrustation en bas à droite : retour caméra de l'utilisateur (« Toi »). */
function SelfView({ track }: { track: TrackReferenceOrPlaceholder | undefined }) {
  return (
    <div className="absolute right-3 bottom-3 z-10 aspect-video w-40 overflow-hidden rounded-lg border border-border bg-card shadow-md sm:w-56">
      {hasActiveVideo(track) ? (
        <VideoTrack trackRef={track} className="size-full object-cover" />
      ) : (
        <p className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
          Caméra coupée
        </p>
      )}
      <span className="absolute bottom-1.5 left-1.5 rounded bg-background/85 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
        Toi
      </span>
    </div>
  );
}

/** Panneau latéral de discussion écrite (plein écran sur mobile, colonne droite sur grand écran). */
function ChatPanel({ messages, isSending, localIdentity, selfName, peerName, onSend, onClose }: {
  messages: ReceivedChatMessage[];
  isSending: boolean;
  localIdentity?: string;
  selfName: string;
  peerName: string;
  onSend?: (message: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submitMessage = async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft("");
    try {
      await onSend?.(text);
    } catch {
      // Erreur d'envoi gérée par LiveKit
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submitMessage();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitMessage();
    }
  };

  return (
    <aside aria-label="Discussion" className="absolute inset-0 z-20 flex flex-col bg-background md:static md:w-80 md:shrink-0 md:border-l">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-heading text-base font-medium">Discussion</h2>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Fermer la discussion" onClick={onClose}>
          <X aria-hidden="true" />
        </Button>
      </div>

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="m-auto text-center text-xs text-muted-foreground">
            Aucun message. La discussion n&apos;est pas enregistrée.
          </p>
        ) : (
          messages.map((msg, index) => {
            const own = isOwnMessage(msg, localIdentity, selfName);
            const author = msg.from?.name || (own ? selfName : peerName);
            const time = formatTime(new Date(msg.timestamp).toISOString());
            return (
              <div
                key={msg.id ?? `${msg.timestamp}-${index}`}
                className={cn("flex max-w-[85%] flex-col gap-1", own ? "items-end self-end" : "items-start self-start")}
              >
                <p className="text-[11px] text-muted-foreground">{author} · {time}</p>
                <p className={cn("rounded-lg px-3 py-2 text-sm break-words", own ? "bg-muted text-foreground" : "border bg-card text-foreground")}>
                  {msg.message}
                </p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrire un message"
          aria-label="Écrire un message"
          maxLength={1000}
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <Button
          type="submit"
          size="icon-sm"
          aria-label="Envoyer"
          disabled={!draft.trim() || isSending}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
      </form>
    </aside>
  );
}

/** Barre du bas : contrôles audio, vidéo, partage d'écran, discussion et fin d'appel. */
function ControlBar({
  pending,
  isMicrophoneEnabled,
  isCameraEnabled,
  isScreenShareEnabled,
  chatOpen,
  hasUnread,
  onToggle,
  onToggleChat,
  onLeave,
}: {
  pending: boolean;
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenShareEnabled: boolean;
  chatOpen: boolean;
  hasUnread: boolean;
  onToggle: (kind: "audio" | "video" | "screen") => void;
  onToggleChat: () => void;
  onLeave: () => void;
}) {
  const canScreenShare = typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function";
  const labelClass = "text-xs uppercase tracking-wider";

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t bg-background px-4 py-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        aria-pressed={isMicrophoneEnabled}
        onClick={() => onToggle("audio")}
        className={labelClass}
      >
        {isMicrophoneEnabled ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
        Micro
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        aria-pressed={isCameraEnabled}
        onClick={() => onToggle("video")}
        className={labelClass}
      >
        {isCameraEnabled ? <Video aria-hidden="true" /> : <VideoOff aria-hidden="true" />}
        Caméra
      </Button>

      {canScreenShare && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          aria-pressed={isScreenShareEnabled}
          onClick={() => onToggle("screen")}
          className={labelClass}
        >
          <MonitorUp aria-hidden="true" />
          Partager l&apos;écran
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={chatOpen}
        onClick={onToggleChat}
        className={cn(
          labelClass,
          chatOpen && "bg-foreground text-background hover:bg-foreground/90 hover:text-background dark:bg-foreground dark:text-background dark:hover:bg-foreground/90",
        )}
      >
        <MessageSquare aria-hidden="true" />
        Discussion
        {hasUnread && <span aria-hidden="true" data-unread="true" className="size-2 shrink-0 rounded-full bg-primary" />}
      </Button>

      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onLeave}
        className={cn(labelClass, "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90")}
      >
        <PhoneOff aria-hidden="true" />
        Quitter
      </Button>
    </div>
  );
}
