"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarClock, Copy, MoreHorizontal, Plus, Video, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DURATIONS,
  HORIZON_MONTHS,
  MIN_NOTICE_HOURS,
  TIME_ZONE,
  formatLongDate,
  formatTime,
  parisDay,
  slotsForDay,
  type HourRange,
  type RdvConfig,
} from "@/lib/rdv";
import { addException, ownerCancel, ownerReschedule, removeException, saveSettings } from "./actions";

export type ManagedException = { id: string; day: string; start: string | null; end: string | null };
export type ManagedAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  duration_min: number;
  guest_first: string;
  guest_last: string;
  guest_email: string;
  message: string;
  /** Rendez-vous annulés : qui a annulé (le visiteur ou toi). */
  cancelled_by?: "guest" | "owner" | null;
};

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const DEFAULT_DAY_RANGES = [
  { start: "09:00", end: "12:00" },
  { start: "14:00", end: "18:00" },
];

const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "long",
});

const formatShortDate = (day: string) => SHORT_DATE.format(new Date(`${day}T12:00:00Z`));

const card = "space-y-4 rounded-xl border bg-card p-4 sm:p-5";
const sectionTitle = "text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground";
// Onglet de page : soulignement carmin sous l'onglet actif, texte actif en foreground, inactif en muted-foreground.
const pageTab = "px-3 py-1.5 text-muted-foreground data-active:text-foreground after:bg-primary";
// Sous-onglet sélectionné aux couleurs de l'application (carmin), comme la page active du menu.
const activeTab =
  "data-active:bg-primary data-active:text-primary-foreground dark:data-active:border-transparent dark:data-active:bg-primary dark:data-active:text-primary-foreground";

/** Propose une nouvelle plage simple et sans chevauchement pour un jour déjà ouvert. */
function nextRangeForDay(existing: HourRange[]): { start: string; end: string } {
  if (existing.length === 1 && existing[0].end <= "13:00") {
    return { start: "14:00", end: "18:00" };
  }
  const last = existing[existing.length - 1];
  if (last) {
    const [h] = last.end.split(":").map(Number);
    if (Number.isInteger(h) && h + 2 <= 23) {
      const startH = String(h + 1).padStart(2, "0");
      const endH = String(Math.min(h + 3, 23)).padStart(2, "0");
      return { start: `${startH}:00`, end: `${endH}:00` };
    }
  }
  return { start: "09:00", end: "12:00" };
}

export function RdvManager({
  username,
  nowIso,
  initial,
  appointments,
  past = [],
  cancelled = [],
}: {
  username: string;
  nowIso: string;
  initial: { enabled: boolean; durations: number[]; hours: HourRange[]; exceptions: ManagedException[] };
  appointments: ManagedAppointment[];
  past?: ManagedAppointment[];
  cancelled?: ManagedAppointment[];
}) {
  return (
    <Tabs defaultValue="appointments" className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
        <TabsList variant="line">
          <TabsTrigger value="appointments" className={pageTab}>
            Rendez-vous
          </TabsTrigger>
          <TabsTrigger value="availability" className={pageTab}>
            Disponibilités
          </TabsTrigger>
        </TabsList>
        <CopyBookingLink username={username} />
      </div>

      <TabsContent value="appointments">
        <AppointmentsCard
          appointments={appointments}
          past={past}
          cancelled={cancelled}
          initial={initial}
          nowIso={nowIso}
        />
      </TabsContent>

      <TabsContent value="availability">
        <AvailabilityTab initial={initial} />
      </TabsContent>
    </Tabs>
  );
}

function CopyBookingLink({ username }: { username: string }) {
  const [notice, setNotice] = useState<string | null>(null);

  const copy = async () => {
    const url = `${window.location.origin}/${username}?onglet=rdv`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Adresse copiée");
    } catch {
      setNotice(`Copie impossible : ${url}`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs uppercase tracking-wider"
        onClick={copy}
      >
        <Copy aria-hidden="true" className="size-3.5" />
        Copier l&apos;adresse de réservation
      </Button>
      {notice && (
        <p role="status" className="text-xs text-muted-foreground">
          {notice}
        </p>
      )}
    </div>
  );
}

function AvailabilityTab({
  initial,
}: {
  initial: { enabled: boolean; durations: number[]; hours: HourRange[]; exceptions: ManagedException[] };
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [durations, setDurations] = useState<number[]>(initial.durations);
  const [hours, setHours] = useState<HourRange[]>(initial.hours);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const rememberedHours = useRef<Map<number, { start: string; end: string }[]>>(new Map());

  const toggleDuration = (d: number) =>
    setDurations((current) => (current.includes(d) ? current.filter((x) => x !== d) : [...current, d]));

  const updateHour = (index: number, patch: Partial<HourRange>) =>
    setHours((current) => current.map((h, i) => (i === index ? { ...h, ...patch } : h)));

  const toggleDay = (weekday: number, checked: boolean) => {
    if (!checked) {
      const currentDayRanges = hours
        .filter((h) => h.weekday === weekday)
        .map(({ start, end }) => ({ start, end }));
      if (currentDayRanges.length > 0) {
        rememberedHours.current.set(weekday, currentDayRanges);
      }
      setHours((current) => current.filter((h) => h.weekday !== weekday));
    } else {
      const restored = rememberedHours.current.get(weekday);
      const ranges = restored && restored.length > 0 ? restored : DEFAULT_DAY_RANGES;
      setHours((current) => [
        ...current.filter((h) => h.weekday !== weekday),
        ...ranges.map((r) => ({ weekday, start: r.start, end: r.end })),
      ]);
    }
  };

  const addRange = (weekday: number) => {
    setHours((current) => {
      const dayRanges = current.filter((h) => h.weekday === weekday);
      const next = nextRangeForDay(dayRanges);
      return [...current, { weekday, ...next }];
    });
  };

  const removeRange = (index: number) => {
    setHours((current) => current.filter((_, k) => k !== index));
  };

  const save = () =>
    startTransition(async () => {
      setMessage(null);
      const result = await saveSettings({ enabled, durations, hours });
      setMessage(result.ok ? { ok: true, text: "Enregistré." } : { ok: false, text: result.error });
    });

  const sortedDurations = [...durations].sort((a, b) => a - b);
  const durationsLabel = sortedDurations.length > 0 ? sortedDurations.join(" / ") : "—";

  return (
    <div className="space-y-6">
      {/* a. Carte étroite : ouverture des réservations */}
      <div className="max-w-md rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Réservations ouvertes</p>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? "L'onglet « Rendez-vous » est visible sur ton profil public."
                : "Fermées : l'onglet « Rendez-vous » n'apparaît pas sur ton profil public."}
            </p>
          </div>
          <Switch aria-label="Réservations ouvertes" checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {/* b. Grille deux colonnes sur grand écran */}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        {/* c. Colonne gauche : horaires de la semaine */}
        <section aria-labelledby="rdv-weekly-hours" className={card}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="rdv-weekly-hours" className={sectionTitle}>
              HORAIRES DE LA SEMAINE
            </h2>
            <p className="text-xs text-muted-foreground">Créneaux de {durationsLabel} min, heure de Paris</p>
          </div>

          <div className="divide-y">
            {WEEKDAYS.map((name, i) => {
              const weekday = i + 1;
              const rows = hours.map((h, index) => ({ h, index })).filter(({ h }) => h.weekday === weekday);
              const isOpen = rows.length > 0;
              return (
                <div key={name} className="flex flex-wrap items-center gap-3 py-3 first:pt-1 last:pb-1">
                  <label className="flex w-28 shrink-0 items-center gap-2.5 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-primary"
                      aria-label={name}
                      checked={isOpen}
                      onChange={(e) => toggleDay(weekday, e.target.checked)}
                    />
                    <span>{name}</span>
                  </label>

                  {isOpen ? (
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      {rows.map(({ h, index }) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <Input
                            type="time"
                            step={300}
                            aria-label={`${name} : début`}
                            className="w-28"
                            value={h.start}
                            onChange={(e) => updateHour(index, { start: e.target.value })}
                          />
                          <span aria-hidden="true" className="text-muted-foreground">
                            –
                          </span>
                          <Input
                            type="time"
                            step={300}
                            aria-label={`${name} : fin`}
                            className="w-28"
                            value={h.end}
                            onChange={(e) => updateHour(index, { end: e.target.value })}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            aria-label={`Retirer la plage de ${name}`}
                            onClick={() => removeRange(index)}
                          >
                            <X aria-hidden="true" className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Ajouter une plage le ${name}`}
                        onClick={() => addRange(weekday)}
                      >
                        <Plus aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Fermé</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* d. Colonne droite : jours particuliers et réglages */}
        <div className="space-y-6">
          <ExceptionsSection exceptions={initial.exceptions} />
          <RulesSection durations={durations} onToggleDuration={toggleDuration} />
        </div>
      </div>

      {/* e. Bouton Enregistrer en bas à droite */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={message.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}
          >
            {message.text}
          </p>
        )}
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

function ExceptionsSection({ exceptions }: { exceptions: ManagedException[] }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState("");
  const [custom, setCustom] = useState(false);
  const [start, setStart] = useState("14:00");
  const [end, setEnd] = useState("17:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () =>
    startTransition(async () => {
      setError(null);
      const result = await addException(custom ? { day, start, end } : { day });
      if (result.ok) setDay("");
      else setError(result.error);
    });

  return (
    <section aria-labelledby="rdv-exceptions" className={card}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="rdv-exceptions" className={sectionTitle}>
          JOURS PARTICULIERS
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus aria-hidden="true" className="size-3.5" />
          Ajouter une date
        </Button>
      </div>

      {open && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <label className="block space-y-1 text-sm">
            <span>Date</span>
            <Input type="date" className="w-full" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={custom}
              onChange={(e) => setCustom(e.target.checked)}
            />
            Horaires particuliers (sinon, jour fermé)
          </label>
          {custom && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="time"
                step={300}
                aria-label="Exception : début"
                className="w-28"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              <span aria-hidden="true">–</span>
              <Input
                type="time"
                step={300}
                aria-label="Exception : fin"
                className="w-28"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={pending || !day}>
            Ajouter
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {exceptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun jour particulier.</p>
      ) : (
        <ul className="divide-y">
          {exceptions.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0">
              <span>{formatShortDate(e.day)}</span>
              <div className="flex items-center gap-2">
                {e.start && e.end ? (
                  <span>
                    {e.start} – {e.end}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Indisponible</span>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  aria-label={`Retirer l'exception du ${e.day}`}
                  onClick={() => startTransition(async () => void (await removeException(e.id)))}
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RulesSection({
  durations,
  onToggleDuration,
}: {
  durations: number[];
  onToggleDuration: (d: number) => void;
}) {
  const readonlyRows = [
    { label: "Pause après un rendez-vous", value: "Aucune" },
    { label: "Préavis minimum", value: `${MIN_NOTICE_HOURS} h` },
    { label: "Réservable jusqu'à", value: `${HORIZON_MONTHS} mois` },
    { label: "Rendez-vous par jour", value: "Pas de limite" },
    { label: "Fuseau horaire", value: TIME_ZONE },
  ];

  return (
    <section aria-labelledby="rdv-rules" className={card}>
      <h2 id="rdv-rules" className={sectionTitle}>
        RÉGLAGES
      </h2>
      <div className="divide-y text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0">
          <span>Durée</span>
          <div className="flex flex-wrap items-center gap-3">
            {DURATIONS.map((d) => (
              <label key={d} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={durations.includes(d)}
                  onChange={() => onToggleDuration(d)}
                />
                {d} min
              </label>
            ))}
          </div>
        </div>
        {readonlyRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2 py-2.5 last:pb-0">
            <span className="text-muted-foreground">{row.label}</span>
            <span>{row.value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Ces règles sont fixes pour l&apos;instant.</p>
    </section>
  );
}

function AppointmentSummary({
  appointment: a,
  cancelled = false,
}: {
  appointment: ManagedAppointment;
  cancelled?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className={cancelled ? "font-medium text-muted-foreground line-through" : "font-medium"}>
        {formatLongDate(a.starts_at)} à {formatTime(a.starts_at)} · {a.duration_min} min
      </p>
      <p>
        {a.guest_first} {a.guest_last} ·{" "}
        <a className="underline" href={`mailto:${a.guest_email}`}>
          {a.guest_email}
        </a>
      </p>
      {a.message && <p className="mt-1 text-muted-foreground">« {a.message} »</p>}
    </div>
  );
}

function AppointmentsCard({
  appointments,
  past,
  cancelled,
  initial,
  nowIso,
}: {
  appointments: ManagedAppointment[];
  past: ManagedAppointment[];
  cancelled: ManagedAppointment[];
  initial: { durations: number[]; hours: HourRange[]; exceptions: ManagedException[] };
  nowIso: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [moveDay, setMoveDay] = useState("");
  const [pending, startTransition] = useTransition();
  const now = new Date(nowIso);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.ok) {
        setConfirming(null);
        setMoving(null);
      } else setError(result.error ?? "Impossible d'enregistrer. Réessaie.");
    });

  // Pour reporter : les créneaux libres, sans compter le rendez-vous qu'on déplace comme « occupé ».
  const slotsFor = (a: ManagedAppointment) => {
    if (!moveDay) return [];
    const config: RdvConfig = {
      durations: [a.duration_min],
      hours: initial.hours,
      exceptions: initial.exceptions.map(({ day, start, end }) => ({ day, start, end })),
      busy: appointments.filter((x) => x.id !== a.id).map((x) => ({ start: x.starts_at, end: x.ends_at })),
    };
    // L'heure actuelle du rendez-vous n'est pas proposée : la « reporter » là ne changerait rien.
    return slotsForDay(config, a.duration_min, moveDay, now).filter((iso) => Date.parse(iso) !== Date.parse(a.starts_at));
  };

  return (
    <section aria-label="Liste des rendez-vous" className={card}>
      <Tabs defaultValue="upcoming" className="space-y-3">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className={activeTab}>À venir ({appointments.length})</TabsTrigger>
          <TabsTrigger value="past" className={activeTab}>Passés ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled" className={activeTab}>Annulés ({cancelled.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rendez-vous à venir.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {appointments.map((a) => (
                <li key={a.id} className="space-y-3 p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <AppointmentSummary appointment={a} />
                    <div className="flex gap-2">
                      {/* Visio (LiveKit) pas encore branchée : bouton en place, grisé. */}
                      <Button type="button" size="sm" disabled title="Visio bientôt disponible">
                        <Video aria-hidden="true" className="size-4" />
                        Rejoindre
                      </Button>
                      {confirming === a.id ? (
                        <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => run(() => ownerCancel(a.id))}>
                          Confirmer l&apos;annulation
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" size="sm" onClick={() => { setConfirming(a.id); setMoving(null); }}>
                          Annuler
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" />}
                          aria-label={`Autres actions pour le rendez-vous de ${a.guest_first} ${a.guest_last}`}
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-36">
                          <DropdownMenuItem onClick={() => { setMoving(moving === a.id ? null : a.id); setMoveDay(parisDay(now)); setConfirming(null); }}>
                            <CalendarClock aria-hidden="true" />
                            Reporter
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {moving === a.id && (
                    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                      <label className="flex flex-wrap items-center gap-2">
                        <span>Nouveau jour</span>
                        <Input type="date" className="w-44" value={moveDay} onChange={(e) => setMoveDay(e.target.value)} />
                        <span className="text-muted-foreground">Heure de Paris</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {slotsFor(a).map((iso) => (
                          <Button key={iso} type="button" variant="outline" size="sm" disabled={pending} onClick={() => run(() => ownerReschedule(a.id, iso))}>
                            {formatTime(iso)}
                          </Button>
                        ))}
                        {slotsFor(a).length === 0 && <p className="text-muted-foreground">Aucun créneau libre ce jour-là.</p>}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="past">
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rendez-vous passé.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {past.map((a) => (
                <li key={a.id} className="p-3 text-sm">
                  <AppointmentSummary appointment={a} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="cancelled">
          {cancelled.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rendez-vous annulé.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {cancelled.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 p-3 text-sm">
                  <AppointmentSummary appointment={a} cancelled />
                  <Badge variant="secondary">
                    {a.cancelled_by === "guest" ? "Annulé par le visiteur" : "Annulé par toi"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
