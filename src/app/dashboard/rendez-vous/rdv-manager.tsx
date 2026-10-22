"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DURATIONS,
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

const card = "space-y-4 rounded-xl border bg-card p-4 sm:p-5";
const sectionTitle = "font-heading text-xl font-normal tracking-tight";

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
    <div className="space-y-6">
      <AppointmentsCard
        appointments={appointments}
        past={past}
        cancelled={cancelled}
        initial={initial}
        nowIso={nowIso}
      />
      <SettingsCard username={username} initial={initial} />
      <ExceptionsCard exceptions={initial.exceptions} />
    </div>
  );
}

function SettingsCard({
  username,
  initial,
}: {
  username: string;
  initial: { enabled: boolean; durations: number[]; hours: HourRange[] };
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [durations, setDurations] = useState<number[]>(initial.durations);
  const [hours, setHours] = useState<HourRange[]>(initial.hours);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleDuration = (d: number) =>
    setDurations((current) => (current.includes(d) ? current.filter((x) => x !== d) : [...current, d]));
  const update = (index: number, patch: Partial<HourRange>) =>
    setHours((current) => current.map((h, i) => (i === index ? { ...h, ...patch } : h)));

  const save = () =>
    startTransition(async () => {
      setMessage(null);
      const result = await saveSettings({ enabled, durations, hours });
      setMessage(result.ok ? { ok: true, text: "Enregistré." } : { ok: false, text: result.error });
    });

  return (
    <section aria-labelledby="rdv-settings" className={card}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="rdv-settings" className={sectionTitle}>
            Réservation en ligne
          </h2>
          <p className="text-sm text-muted-foreground">
            {enabled
              ? `L'onglet « Rendez-vous » est visible sur ton profil public (/${username}).`
              : "Désactivée : l'onglet « Rendez-vous » n'apparaît pas sur ton profil public."}
          </p>
        </div>
        <Switch aria-label="Réservation en ligne" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Durées proposées</legend>
        <div className="flex flex-wrap gap-4">
          {DURATIONS.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" checked={durations.includes(d)} onChange={() => toggleDuration(d)} />
              {d} min
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Horaires de la semaine (heure de Paris)</legend>
        {WEEKDAYS.map((name, i) => {
          const weekday = i + 1;
          const rows = hours.map((h, index) => ({ h, index })).filter(({ h }) => h.weekday === weekday);
          return (
            <div key={name} className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-start">
              <p className="w-28 shrink-0 pt-1.5 text-sm">{name}</p>
              <div className="flex-1 space-y-2">
                {rows.length === 0 && <p className="pt-1.5 text-sm text-muted-foreground">Indisponible</p>}
                {rows.map(({ h, index }) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <Input type="time" step={300} aria-label={`${name} : début`} className="w-28" value={h.start} onChange={(e) => update(index, { start: e.target.value })} />
                    <span aria-hidden="true">–</span>
                    <Input type="time" step={300} aria-label={`${name} : fin`} className="w-28" value={h.end} onChange={(e) => update(index, { end: e.target.value })} />
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Retirer la plage de ${name}`} onClick={() => setHours((c) => c.filter((_, k) => k !== index))}>
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setHours((c) => [...c, { weekday, start: "09:00", end: "12:00" }])}>
                  <Plus aria-hidden="true" className="size-4" />
                  Ajouter une plage
                </Button>
              </div>
            </div>
          );
        })}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
}

function ExceptionsCard({ exceptions }: { exceptions: ManagedException[] }) {
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
      <div>
        <h2 id="rdv-exceptions" className={sectionTitle}>
          Exceptions
        </h2>
        <p className="text-sm text-muted-foreground">Un jour de congé, ou des horaires particuliers à une date précise.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span>Date</span>
          <Input type="date" className="w-44" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
          Horaires particuliers (sinon, jour fermé)
        </label>
        {custom && (
          <div className="flex items-center gap-2 pb-0.5">
            <Input type="time" step={300} aria-label="Exception : début" className="w-28" value={start} onChange={(e) => setStart(e.target.value)} />
            <span aria-hidden="true">–</span>
            <Input type="time" step={300} aria-label="Exception : fin" className="w-28" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        )}
        <Button type="button" variant="outline" onClick={add} disabled={pending || !day}>
          Ajouter
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {exceptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune exception.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {exceptions.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                {formatLongDate(`${e.day}T12:00:00Z`)} ·{" "}
                {e.start && e.end ? `${e.start}–${e.end}` : <Badge variant="secondary">Fermé</Badge>}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Retirer l'exception du ${e.day}`}
                onClick={() => startTransition(async () => void (await removeException(e.id)))}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
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
    <section aria-labelledby="rdv-appointments" className={card}>
      <h2 id="rdv-appointments" className={sectionTitle}>
        Tes rendez-vous
      </h2>
      <Tabs defaultValue="upcoming" className="space-y-3">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="upcoming">À venir ({appointments.length})</TabsTrigger>
          <TabsTrigger value="past">Passés ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Annulés ({cancelled.length})</TabsTrigger>
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
                      <Button type="button" variant="outline" size="sm" onClick={() => { setMoving(moving === a.id ? null : a.id); setMoveDay(parisDay(now)); setConfirming(null); }}>
                        Reporter
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
