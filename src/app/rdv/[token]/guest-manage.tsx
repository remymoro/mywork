"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatLongDate, formatTime, parisDay, slotsForDay, type RdvConfig } from "@/lib/rdv";
import { cancelAppointment, rescheduleAppointment } from "../actions";

export type GuestAppointment = {
  status: "confirmed" | "cancelled";
  starts_at: string;
  duration_min: number;
  owner_name: string;
};

export function GuestManage({
  token,
  appointment,
  config,
  nowIso,
}: {
  token: string;
  appointment: GuestAppointment;
  config: RdvConfig | null;
  nowIso: string;
}) {
  const router = useRouter();
  const now = new Date(nowIso);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "cancel" | "move">("view");
  const [day, setDay] = useState(parisDay(now));
  const [moved, setMoved] = useState(false);
  const [pending, startTransition] = useTransition();

  const upcoming = appointment.status === "confirmed" && new Date(appointment.starts_at) > now;
  const when = `${formatLongDate(appointment.starts_at)} à ${formatTime(appointment.starts_at)} (heure de Paris), ${appointment.duration_min} min`;

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.ok) {
        onDone?.();
        router.refresh();
      } else setError(result.error ?? "Impossible d'enregistrer. Réessaie.");
    });

  // Créneaux libres pour reporter, à la même durée (le rendez-vous actuel compte comme occupé : on change de créneau).
  const slots = config && mode === "move" ? slotsForDay({ ...config, durations: [appointment.duration_min] }, appointment.duration_min, day, now) : [];

  if (appointment.status === "cancelled") {
    return (
      <Alert role="status">
        <AlertTitle>Rendez-vous annulé</AlertTitle>
        <AlertDescription>
          <p>{when}</p>
          <p>Tu peux reprendre rendez-vous depuis le profil de {appointment.owner_name}.</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {moved ? "NOUVEAU CRÉNEAU" : upcoming ? "CONFIRMÉ" : "TERMINÉ"}
        </p>
        <p className="mt-1 font-medium">{when}</p>
      </div>

      {error && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {upcoming && mode === "view" && (
        <div className="flex flex-wrap gap-2">
          {config && (
            <Button type="button" variant="outline" onClick={() => setMode("move")}>
              Reporter
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => setMode("cancel")}>
            Annuler le rendez-vous
          </Button>
        </div>
      )}

      {upcoming && mode === "cancel" && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <p className="text-sm">Annuler ce rendez-vous ? {appointment.owner_name} sera prévenu(e) par e-mail et le créneau sera libéré.</p>
          <div className="flex gap-2">
            <Button type="button" variant="destructive" disabled={pending} onClick={() => run(() => cancelAppointment(token))}>
              Oui, annuler
            </Button>
            <Button type="button" variant="outline" onClick={() => setMode("view")}>
              Garder le rendez-vous
            </Button>
          </div>
        </div>
      )}

      {upcoming && mode === "move" && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span>Nouveau jour</span>
            <Input type="date" className="w-44" min={parisDay(now)} value={day} onChange={(e) => setDay(e.target.value)} />
            <span className="text-muted-foreground">Heure de Paris</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {slots.map((iso) => (
              <Button
                key={iso}
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => run(() => rescheduleAppointment(token, iso), () => { setMoved(true); setMode("view"); })}
              >
                {formatTime(iso)}
              </Button>
            ))}
            {slots.length === 0 && <p className="text-sm text-muted-foreground">Aucun créneau libre ce jour-là.</p>}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode("view")}>
            Retour
          </Button>
        </div>
      )}
    </div>
  );
}
