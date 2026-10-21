"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateHeader, type FormState } from "./actions";

export type HeaderFormProps = {
  location: string;
  openToWork: boolean;
  openToWorkDetails: string;
  contactEmail: string;
  websiteUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  otherUrl: string;
};

export function HeaderForm(initial: HeaderFormProps) {
  const [openToWork, setOpenToWork] = useState(initial.openToWork);
  const [state, action, pending] = useActionState<FormState, FormData>(updateHeader, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>En-tête</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Localisation</Label>
              <Input
                id="location"
                name="location"
                maxLength={100}
                defaultValue={initial.location}
                placeholder="Ex. Lyon, France"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">E-mail de contact</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                maxLength={254}
                defaultValue={initial.contactEmail}
                placeholder="contact@exemple.fr"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <input
                id="open_to_work"
                name="open_to_work"
                type="checkbox"
                checked={openToWork}
                onChange={(e) => setOpenToWork(e.target.checked)}
                className="size-4 accent-primary"
              />
              <Label htmlFor="open_to_work">Ouvert aux opportunités</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="open_to_work_details">Précision sur la disponibilité</Label>
              <Input
                id="open_to_work_details"
                name="open_to_work_details"
                maxLength={120}
                defaultValue={initial.openToWorkDetails}
                disabled={!openToWork}
                placeholder="Ex. Freelance, CDI, temps partiel…"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website_url">Site web</Label>
              <Input
                id="website_url"
                name="website_url"
                maxLength={300}
                defaultValue={initial.websiteUrl}
                placeholder="https://monsite.fr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input
                id="linkedin_url"
                name="linkedin_url"
                maxLength={300}
                defaultValue={initial.linkedinUrl}
                placeholder="https://linkedin.com/in/…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github_url">GitHub</Label>
              <Input
                id="github_url"
                name="github_url"
                maxLength={300}
                defaultValue={initial.githubUrl}
                placeholder="https://github.com/…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="other_url">Autre lien</Label>
              <Input
                id="other_url"
                name="other_url"
                maxLength={300}
                defaultValue={initial.otherUrl}
                placeholder="https://…"
              />
            </div>
          </div>

          {state.error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          {state.saved && (
            <Alert variant="success" role="status">
              <AlertDescription>En-tête enregistré.</AlertDescription>
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
