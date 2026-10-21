"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WORK_MODES, toMonthInput } from "@/lib/profile-sections";
import { updateFreelance, type FormState } from "./actions";

type Props = {
  enabled: boolean;
  availableFrom: string | null;
  daysPerWeek: number | null;
  workModes: string[];
  dailyRate: number | null;
  travelZone: string;
};

export function FreelanceForm(initial: Props) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [state, action, pending] = useActionState<FormState, FormData>(updateFreelance, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Freelance</CardTitle>
        <CardDescription>
          Coche la case pour proposer tes services en freelance sur ta page publique. Décochée, rien
          n&apos;est affiché, mais tes informations sont gardées.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <label className="flex items-center gap-2 rounded-lg border p-3 text-sm font-medium">
            <input
              type="checkbox"
              name="freelance_enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="size-4 accent-primary"
            />
            Je propose mes services en freelance
          </label>

          {/* Champs masqués (mais envoyés) quand la case est décochée : on ne perd rien. */}
          <fieldset hidden={!enabled} className="space-y-4">
            <legend className="sr-only">Détails de l&apos;offre freelance</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="freelance_available_from">Disponible à partir de</Label>
                <Input
                  id="freelance_available_from"
                  name="freelance_available_from"
                  type="month"
                  defaultValue={toMonthInput(initial.availableFrom)}
                />
                <p className="text-xs text-muted-foreground">Vide = disponible dès maintenant.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="freelance_days_per_week">Jours par semaine</Label>
                <Input
                  id="freelance_days_per_week"
                  name="freelance_days_per_week"
                  type="number"
                  min={1}
                  max={5}
                  defaultValue={initial.daysPerWeek ?? ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Mode de travail</p>
              <div className="flex flex-wrap gap-4">
                {WORK_MODES.map((mode) => (
                  <label key={mode.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`freelance_mode_${mode.value}`}
                      defaultChecked={initial.workModes.includes(mode.value)}
                      className="size-4 accent-primary"
                    />
                    {mode.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="freelance_daily_rate">TJM (€ HT par jour)</Label>
                <Input
                  id="freelance_daily_rate"
                  name="freelance_daily_rate"
                  type="number"
                  min={1}
                  max={10000}
                  inputMode="numeric"
                  defaultValue={initial.dailyRate ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="freelance_travel_zone">Zone de déplacement</Label>
                <Input
                  id="freelance_travel_zone"
                  name="freelance_travel_zone"
                  maxLength={120}
                  defaultValue={initial.travelZone}
                  placeholder="Ex. Agen et 100 km, Bordeaux"
                />
              </div>
            </div>
          </fieldset>

          {state.error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          {state.saved && (
            <Alert variant="success" role="status">
              <AlertDescription>Offre freelance enregistrée.</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={pending}>
            Enregistrer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
