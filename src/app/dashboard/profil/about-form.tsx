"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ABOUT_MAX, TOP_SKILLS_MAX } from "@/lib/profile-sections";
import { updateAbout, type FormState } from "./actions";

type Props = {
  about: string;
  topSkills: string[];
};

export function AboutForm({ about: initialAbout, topSkills }: Props) {
  const [about, setAbout] = useState(initialAbout);
  const [state, action, pending] = useActionState<FormState, FormData>(updateAbout, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>À propos</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="about">Présentation</Label>
              <span className="text-xs text-muted-foreground">
                {about.length} / {ABOUT_MAX}
              </span>
            </div>
            <Textarea
              id="about"
              name="about"
              rows={5}
              maxLength={ABOUT_MAX}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Présente ton parcours, tes spécialités et ce que tu recherches…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="top_skills">
              Compétences clés ({TOP_SKILLS_MAX} maximum, séparées par des virgules)
            </Label>
            <Input
              id="top_skills"
              name="top_skills"
              defaultValue={topSkills.join(", ")}
              placeholder="Ex. Architecture, Produit, Management…"
            />
          </div>

          {state.error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          {state.saved && (
            <Alert variant="success" role="status">
              <AlertDescription>Présentation enregistrée.</AlertDescription>
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
