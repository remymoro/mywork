"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FREELANCE_AVAILABILITY, type FreelanceAvailability } from "@/lib/profile-sections";
import { updateFreelance, type FormState } from "./actions";
import { SECTION_HEADER, SECTION_TITLE } from "./section-style";

// Libellés de la maquette (« À distance » plutôt que « Télétravail »), mêmes valeurs qu'en base.
const FREELANCE_MODES = [
  { value: "teletravail", label: "À distance" },
  { value: "sur_site", label: "Sur site" },
  { value: "hybride", label: "Hybride" },
] as const;

type Props = {
  enabled: boolean;
  availability: FreelanceAvailability;
  availableFrom: string | null;
  workModes: string[];
  dailyRate: number | null;
  travelZone: string;
  /** Liste des prestations, affichée sous le formulaire (hors du <form> : elle a ses propres formulaires). */
  services: ReactNode;
};

export function FreelanceForm({ services, ...initial }: Props) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [availability, setAvailability] = useState(initial.availability);
  const [state, action, pending] = useActionState<FormState, FormData>(updateFreelance, {});

  return (
    <Card>
      <CardHeader className={SECTION_HEADER}>
        <CardTitle className={SECTION_TITLE}>Offre freelance</CardTitle>
        <CardAction className="flex items-center gap-3 self-center">
          <label htmlFor="freelance_enabled" className="text-sm">
            Je propose mes services en freelance
          </label>
          <Switch
            id="freelance_enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        <form id="freelance-form" action={action} className="space-y-5">
          {enabled && <input type="hidden" name="freelance_enabled" value="on" />}
          {!enabled && (
            <p className="text-sm text-muted-foreground">
              Interrupteur coupé : l&apos;offre n&apos;apparaît pas sur ta page publique. Tes informations
              restent enregistrées.
            </p>
          )}

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">Disponibilité</legend>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {FREELANCE_AVAILABILITY.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="freelance_availability"
                    value={option.value}
                    checked={availability === option.value}
                    onChange={() => setAvailability(option.value)}
                    className="size-4 accent-primary"
                  />
                  {option.label}
                </label>
              ))}
              {availability === "a_partir_du" && (
                <Input
                  aria-label="Date de disponibilité"
                  name="freelance_available_from"
                  type="date"
                  required
                  defaultValue={initial.availableFrom ?? ""}
                  className="w-auto"
                />
              )}
            </div>
          </fieldset>

          <div className="grid gap-5 md:grid-cols-[1fr_auto]">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Mode de travail</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {FREELANCE_MODES.map((mode) => (
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
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="freelance_daily_rate" className="font-semibold">
                TJM
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="freelance_daily_rate"
                  name="freelance_daily_rate"
                  type="number"
                  min={1}
                  max={10000}
                  inputMode="numeric"
                  defaultValue={initial.dailyRate ?? ""}
                  className="w-40"
                />
                <span className="text-sm whitespace-nowrap text-muted-foreground">€ HT / jour</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="freelance_travel_zone" className="font-semibold">
              Zone de déplacement
            </Label>
            <Input
              id="freelance_travel_zone"
              name="freelance_travel_zone"
              maxLength={120}
              defaultValue={initial.travelZone}
              placeholder="Lyon et environs, Paris ponctuellement"
            />
          </div>

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

        {services}
      </CardContent>
    </Card>
  );
}
