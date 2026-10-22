"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { bookAppointment } from "@/app/rdv/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GUEST_ROLES,
  REASONS,
  TIME_ZONE,
  addDays,
  addMonth,
  availableDays,
  formatLongDate,
  formatTime,
  isoWeekday,
  monthInWindow,
  parisDay,
  parisInstant,
  slotsForDay,
  validateBooking,
  type BookingErrors,
  type RdvConfig,
} from "@/lib/rdv";
import { cn } from "@/lib/utils";

const DURATION_SUBTITLES: Record<number, string> = {
  15: "Point rapide",
  30: "Échange standard",
  60: "Session approfondie",
};

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"] as const;

const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  month: "long",
  year: "numeric",
});

const DAY_ARIA_LABEL = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const SHORT_DAY_LABEL = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

function daysOfMonth(month: string): string[] {
  const days: string[] = [];
  for (let n = 0; n < 31; n++) {
    const day = addDays(`${month}-01`, n);
    if (!day.startsWith(month)) break;
    days.push(day);
  }
  return days;
}

function windowMonths(now: Date): string[] {
  const startMonth = parisDay(now).slice(0, 7);
  const months: string[] = [];
  for (let i = 0; i <= 3; i++) {
    const m = addMonth(startMonth, i);
    if (monthInWindow(m, now)) months.push(m);
  }
  return months;
}

type ConfirmedAppointment = {
  token: string;
  starts_at: string;
  duration_min: number;
  owner_name: string;
};

/**
 * Parcours de prise de rendez-vous en 4 étapes verticales (Proposition B) :
 * 1. Durée, 2. Jour, 3. Créneau, 4. Coordonnées.
 */
export function BookingWidget({
  username,
  config,
  nowIso,
}: {
  username: string;
  config: RdvConfig;
  nowIso: string;
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const todayParis = useMemo(() => parisDay(now), [now]);

  const [duration, setDuration] = useState<number>(() => config.durations[0] ?? 30);
  const [month, setMonth] = useState<string>(() => todayParis.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [takenBusy, setTakenBusy] = useState<{ start: string; end: string }[]>([]);

  const [role, setRole] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");

  const [fieldErrors, setFieldErrors] = useState<BookingErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedAppointment | null>(null);

  const effectiveConfig = useMemo<RdvConfig>(
    () => (takenBusy.length === 0 ? config : { ...config, busy: [...config.busy, ...takenBusy] }),
    [config, takenBusy],
  );

  const hasAnyAvailability = useMemo(() => {
    const months = windowMonths(now);
    return effectiveConfig.durations.some((dur) =>
      months.some((m) => availableDays(effectiveConfig, dur, m, now).size > 0),
    );
  }, [effectiveConfig, now]);

  const monthAvailDays = useMemo(
    () => availableDays(effectiveConfig, duration, month, now),
    [effectiveConfig, duration, month, now],
  );

  const calendarDays = useMemo(() => daysOfMonth(month), [month]);
  const leadingEmptyCount = useMemo(() => isoWeekday(`${month}-01`) - 1, [month]);

  const daySlots = useMemo(
    () => (selectedDay ? slotsForDay(effectiveConfig, duration, selectedDay, now) : []),
    [effectiveConfig, duration, selectedDay, now],
  );

  const morningSlots = useMemo(
    () => daySlots.filter((iso) => formatTime(iso) < "12:00"),
    [daySlots],
  );
  const afternoonSlots = useMemo(
    () => daySlots.filter((iso) => formatTime(iso) >= "12:00"),
    [daySlots],
  );

  const prevMonth = addMonth(month, -1);
  const nextMonth = addMonth(month, 1);
  const canGoPrev = monthInWindow(prevMonth, now);
  const canGoNext = monthInWindow(nextMonth, now);

  const activeStep = selectedSlot ? 4 : selectedDay ? 3 : 2;

  function handleSelectDuration(newDuration: number) {
    setDuration(newDuration);
    setServerError(null);
    if (selectedDay) {
      const remaining = slotsForDay(effectiveConfig, newDuration, selectedDay, now);
      if (remaining.length === 0) {
        setSelectedDay(null);
        setSelectedSlot(null);
      } else if (selectedSlot && !remaining.includes(selectedSlot)) {
        setSelectedSlot(null);
      }
    }
  }

  function handleSelectDay(day: string) {
    setSelectedDay(day);
    setSelectedSlot(null);
    setServerError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSlot || submitting) return;

    const errors = validateBooking({ first, last, email, message, role, reason, company });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setServerError(null);
    setSubmitting(true);
    try {
      const slotToBook = selectedSlot;
      const result = await bookAppointment({
        username,
        start: slotToBook,
        duration,
        first,
        last,
        email,
        message,
        role,
        reason,
        company,
        website,
      });

      if (!result.ok) {
        if (result.slotTaken) {
          const endIso = new Date(Date.parse(slotToBook) + duration * 60_000).toISOString();
          setTakenBusy((prev) => [...prev, { start: slotToBook, end: endIso }]);
          setSelectedSlot(null);
        }
        setServerError(result.error);
        return;
      }

      setConfirmed(result.appointment);
    } catch {
      setServerError("Impossible d'envoyer la réservation. Vérifie ta connexion et réessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="rdv-title" className="space-y-5 overflow-x-clip">
      <div>
        <h2 id="rdv-title" className="font-heading text-2xl font-normal tracking-tight">
          Prendre rendez-vous
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisis une durée, un jour et un créneau libre.
        </p>
      </div>

      {confirmed ? (
        <div className="mx-auto max-w-xl rounded-xl border bg-card p-6 text-center text-card-foreground sm:p-8">
          <div
            aria-hidden="true"
            className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            <Check aria-hidden="true" className="size-5" />
          </div>
          <h3 className="font-heading text-2xl font-normal tracking-tight text-foreground">
            Rendez-vous confirmé
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Un e-mail de confirmation vient de t&apos;être envoyé.
          </p>

          <dl className="my-5 space-y-2 rounded-lg border bg-secondary p-4 text-left text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Avec</dt>
              <dd className="font-medium text-foreground">{confirmed.owner_name}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium text-foreground">{formatLongDate(confirmed.starts_at)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Créneau</dt>
              <dd className="font-medium text-foreground">
                {formatTime(confirmed.starts_at)} (Heure de Paris)
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Durée</dt>
              <dd className="font-medium text-foreground">{confirmed.duration_min} min</dd>
            </div>
          </dl>

          <Link
            href={`/rdv/${confirmed.token}`}
            className="inline-flex items-center justify-center text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Gérer mon rendez-vous (reporter ou annuler)
          </Link>
        </div>
      ) : !hasAnyAvailability && !serverError ? (
        <div className="rounded-xl border border-dashed bg-card px-5 py-11 text-center text-muted-foreground">
          <div
            aria-hidden="true"
            className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <Calendar aria-hidden="true" className="size-4" />
          </div>
          <p className="text-sm text-foreground">Aucun créneau disponible pour le moment.</p>
        </div>
      ) : (
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          {/* ÉTAPE 1 : DURÉE */}
          <div className="rounded-xl border bg-card p-4 text-card-foreground sm:p-5">
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                  1
                </span>
                <h3 className="font-heading text-lg font-medium">Durée</h3>
              </div>
              <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                {duration} min
              </span>
            </div>

            <div
              role="group"
              aria-label="Choisir une durée"
              className="grid grid-cols-3 gap-2"
            >
              {config.durations.map((d) => {
                const selected = duration === d;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleSelectDuration(d)}
                    className={cn(
                      "rounded-lg border px-2 py-2.5 text-center transition-colors",
                      selected
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border bg-background text-foreground hover:bg-secondary",
                    )}
                  >
                    <strong className="block text-sm font-semibold">{d} min</strong>
                    {DURATION_SUBTITLES[d] && (
                      <span
                        className={cn(
                          "mt-0.5 block text-xs leading-tight",
                          selected ? "text-accent-foreground" : "text-muted-foreground",
                        )}
                      >
                        {DURATION_SUBTITLES[d]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ÉTAPE 2 : JOUR */}
          <div
            className={cn(
              "rounded-xl border bg-card p-4 text-card-foreground transition-colors sm:p-5",
              activeStep === 2 && "border-primary",
            )}
          >
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    activeStep === 2
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}
                >
                  2
                </span>
                <h3 className="font-heading text-lg font-medium">Jour</h3>
              </div>
              <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                {selectedDay ? SHORT_DAY_LABEL.format(parisInstant(selectedDay, "12:00")) : "—"}
              </span>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <span className="font-heading text-base capitalize">
                {MONTH_LABEL.format(parisInstant(`${month}-01`, "12:00"))}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Mois précédent"
                  disabled={!canGoPrev}
                  onClick={() => setMonth(prevMonth)}
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Mois suivant"
                  disabled={!canGoNext}
                  onClick={() => setMonth(nextMonth)}
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="mb-1.5 grid grid-cols-7 text-center text-xs text-muted-foreground"
            >
              {WEEKDAYS.map((w, idx) => (
                <span key={idx}>{w}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: leadingEmptyCount }).map((_, idx) => (
                <span key={`empty-${idx}`} aria-hidden="true" />
              ))}
              {calendarDays.map((day) => {
                const isAvailable = monthAvailDays.has(day);
                const count = isAvailable
                  ? slotsForDay(effectiveConfig, duration, day, now).length
                  : 0;
                const isSelected = selectedDay === day;
                const isToday = day === todayParis;
                const dayNumber = Number(day.slice(8, 10));
                const dayName = DAY_ARIA_LABEL.format(parisInstant(day, "12:00"));
                const ariaLabel =
                  count > 0
                    ? `${dayName}, ${count} ${count > 1 ? "créneaux" : "créneau"}`
                    : `${dayName}, aucun créneau`;

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={!isAvailable}
                    aria-label={ariaLabel}
                    aria-pressed={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    data-today={isToday ? "true" : undefined}
                    data-selected={isSelected ? "true" : undefined}
                    onClick={() => handleSelectDay(day)}
                    className={cn(
                      "relative flex aspect-square items-center justify-center rounded-md border text-sm transition-colors",
                      isSelected
                        ? "border-primary bg-primary font-semibold text-primary-foreground"
                        : isAvailable
                          ? "border-transparent bg-secondary font-medium text-foreground hover:border-primary"
                          : "cursor-not-allowed border-transparent text-muted-foreground opacity-35",
                    )}
                  >
                    {dayNumber}
                    {isToday && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute bottom-1 size-1 rounded-full",
                          isSelected ? "bg-primary-foreground" : "bg-primary",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ÉTAPE 3 : CRÉNEAU */}
          {selectedDay && (
            <div
              className={cn(
                "rounded-xl border bg-card p-4 text-card-foreground transition-colors sm:p-5",
                activeStep === 3 && "border-primary",
              )}
            >
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      activeStep === 3
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    3
                  </span>
                  <h3 className="font-heading text-lg font-medium">Créneau</h3>
                </div>
                <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                  {selectedSlot ? `${formatTime(selectedSlot)} (Paris)` : "À choisir"}
                </span>
              </div>

              <div className="mb-3.5 flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-xs">
                <span className="text-muted-foreground">Fuseau horaire</span>
                <strong className="font-medium text-foreground">Heure de Paris</strong>
              </div>

              {serverError && !selectedSlot && (
                <div
                  role="alert"
                  className="mb-3.5 rounded-md border border-destructive bg-accent px-3.5 py-2.5 text-sm text-accent-foreground"
                >
                  {serverError}
                </div>
              )}

              <div className="space-y-3">
                {[
                  { label: "Matin", items: morningSlots },
                  { label: "Après-midi", items: afternoonSlots },
                ]
                  .filter((group) => group.items.length > 0)
                  .map((group) => (
                    <div key={group.label}>
                      <p className="mb-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        {group.label}
                      </p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {group.items.map((iso) => {
                          const selected = selectedSlot === iso;
                          return (
                            <button
                              key={iso}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => {
                                setSelectedSlot(iso);
                                setServerError(null);
                              }}
                              className={cn(
                                "rounded-md border px-2 py-2 text-center font-mono text-sm transition-colors",
                                selected
                                  ? "border-primary bg-primary font-semibold text-primary-foreground"
                                  : "border-border bg-background text-foreground hover:border-primary",
                              )}
                            >
                              {formatTime(iso)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 4 : COORDONNÉES */}
          {selectedDay && selectedSlot && (
            <div
              className={cn(
                "rounded-xl border bg-card p-4 text-card-foreground transition-colors sm:p-5",
                activeStep === 4 && "border-primary",
              )}
            >
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      activeStep === 4
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    4
                  </span>
                  <h3 className="font-heading text-lg font-medium">Coordonnées</h3>
                </div>
              </div>

              <div className="mb-4 rounded-md border-l-3 border-primary bg-secondary px-3.5 py-2.5 text-sm">
                <strong className="font-medium">Récapitulatif :</strong>{" "}
                {formatLongDate(selectedSlot)} à{" "}
                <strong className="font-medium">{formatTime(selectedSlot)}</strong> (Heure de Paris)
                — <strong className="font-medium">{duration} min</strong>
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="mb-3.5 rounded-md border border-destructive bg-accent px-3.5 py-2.5 text-sm text-accent-foreground"
                >
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                <fieldset
                  role="radiogroup"
                  aria-labelledby="rdv-role-label"
                  aria-invalid={Boolean(fieldErrors.role)}
                  aria-describedby={fieldErrors.role ? "rdv-role-error" : undefined}
                  className="space-y-1.5"
                >
                  <legend id="rdv-role-label" className="text-sm leading-none font-medium">
                    Tu es…
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(GUEST_ROLES) as [string, string][]).map(([value, label]) => {
                      const selected = role === value;
                      return (
                        <label
                          key={value}
                          className={cn(
                            "relative cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors select-none focus-within:ring-2 focus-within:ring-ring/50",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:border-primary hover:bg-secondary",
                          )}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={value}
                            checked={selected}
                            onChange={() => {
                              setRole(value);
                              if (fieldErrors.role) {
                                setFieldErrors((prev) => ({ ...prev, role: undefined }));
                              }
                            }}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                  {fieldErrors.role && (
                    <p id="rdv-role-error" className="text-xs text-destructive">
                      {fieldErrors.role}
                    </p>
                  )}
                </fieldset>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rdv-first">Prénom</Label>
                    <Input
                      id="rdv-first"
                      name="first"
                      type="text"
                      autoComplete="given-name"
                      value={first}
                      onChange={(e) => {
                        setFirst(e.target.value);
                        if (fieldErrors.first) {
                          setFieldErrors((prev) => ({ ...prev, first: undefined }));
                        }
                      }}
                      aria-invalid={Boolean(fieldErrors.first)}
                      aria-describedby={fieldErrors.first ? "rdv-first-error" : undefined}
                    />
                    {fieldErrors.first && (
                      <p id="rdv-first-error" className="text-xs text-destructive">
                        {fieldErrors.first}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rdv-last">Nom</Label>
                    <Input
                      id="rdv-last"
                      name="last"
                      type="text"
                      autoComplete="family-name"
                      value={last}
                      onChange={(e) => {
                        setLast(e.target.value);
                        if (fieldErrors.last) {
                          setFieldErrors((prev) => ({ ...prev, last: undefined }));
                        }
                      }}
                      aria-invalid={Boolean(fieldErrors.last)}
                      aria-describedby={fieldErrors.last ? "rdv-last-error" : undefined}
                    />
                    {fieldErrors.last && (
                      <p id="rdv-last-error" className="text-xs text-destructive">
                        {fieldErrors.last}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rdv-email">E-mail</Label>
                  <Input
                    id="rdv-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "rdv-email-error" : undefined}
                  />
                  {fieldErrors.email && (
                    <p id="rdv-email-error" className="text-xs text-destructive">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rdv-company">
                    Entreprise <span className="font-normal text-muted-foreground">(facultatif)</span>
                  </Label>
                  <Input
                    id="rdv-company"
                    name="company"
                    type="text"
                    autoComplete="organization"
                    maxLength={120}
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      if (fieldErrors.company) {
                        setFieldErrors((prev) => ({ ...prev, company: undefined }));
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.company)}
                    aria-describedby={fieldErrors.company ? "rdv-company-error" : undefined}
                  />
                  {fieldErrors.company && (
                    <p id="rdv-company-error" className="text-xs text-destructive">
                      {fieldErrors.company}
                    </p>
                  )}
                </div>

                <fieldset
                  role="radiogroup"
                  aria-labelledby="rdv-reason-label"
                  aria-invalid={Boolean(fieldErrors.reason)}
                  aria-describedby={fieldErrors.reason ? "rdv-reason-error" : undefined}
                  className="space-y-1.5"
                >
                  <legend id="rdv-reason-label" className="text-sm leading-none font-medium">
                    Motif du rendez-vous
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(REASONS) as [string, string][]).map(([value, label]) => {
                      const selected = reason === value;
                      return (
                        <label
                          key={value}
                          className={cn(
                            "relative cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors select-none focus-within:ring-2 focus-within:ring-ring/50",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:border-primary hover:bg-secondary",
                          )}
                        >
                          <input
                            type="radio"
                            name="reason"
                            value={value}
                            checked={selected}
                            onChange={() => {
                              setReason(value);
                              if (fieldErrors.reason) {
                                setFieldErrors((prev) => ({ ...prev, reason: undefined }));
                              }
                            }}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                  {fieldErrors.reason && (
                    <p id="rdv-reason-error" className="text-xs text-destructive">
                      {fieldErrors.reason}
                    </p>
                  )}
                </fieldset>

                <div className="space-y-1.5">
                  <Label htmlFor="rdv-message">
                    Précisions <span className="font-normal text-muted-foreground">(facultatif)</span>
                  </Label>
                  <Textarea
                    id="rdv-message"
                    name="message"
                    rows={3}
                    maxLength={1000}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (fieldErrors.message) {
                        setFieldErrors((prev) => ({ ...prev, message: undefined }));
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.message)}
                    aria-describedby={fieldErrors.message ? "rdv-message-error" : undefined}
                  />
                  {fieldErrors.message && (
                    <p id="rdv-message-error" className="text-xs text-destructive">
                      {fieldErrors.message}
                    </p>
                  )}
                </div>

                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
                />

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-10 w-full text-sm font-semibold"
                >
                  {submitting ? "Envoi…" : "Confirmer le rendez-vous"}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
