"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSkills, type FormState } from "./actions";
import { SECTION_HEADER, SECTION_TITLE } from "./section-style";

type Props = {
  skills: string[];
};

export function SkillsForm({ skills }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateSkills, {});

  return (
    <Card>
      <CardHeader className={SECTION_HEADER}>
        <CardTitle className={SECTION_TITLE}>Compétences</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skills-list">Compétences (séparées par des virgules)</Label>
            <Textarea
              id="skills-list"
              name="skills"
              rows={3}
              defaultValue={skills.join(", ")}
              placeholder="Ex. TypeScript, React, SQL, Gestion de projet…"
            />
          </div>

          {state.error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          {state.saved && (
            <Alert variant="success" role="status">
              <AlertDescription>Compétences enregistrées.</AlertDescription>
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
