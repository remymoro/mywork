"use client";

import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DISPLAY_NAME_MAX, HEADLINE_MAX } from "@/lib/profile";
import { updateProfile, type ProfileState } from "./profile-actions";

type Props = { username: string; displayName: string; headline: string };

export function ProfileEditor(initial: Props) {
  const [username, setUsername] = useState(initial.username);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [headline, setHeadline] = useState(initial.headline);
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});

  const path = `mywork.website/${initial.username}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`https://${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm">
        <span>
          Ton adresse publique : <strong>{path}</strong>
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copyLink}>
            {copied ? "Lien copié" : "Copier le lien"}
          </Button>
          <a
            href={`/${initial.username}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Voir ma page
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Éditer mon profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Pseudo</Label>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>mywork.website/</span>
                  <Input
                    id="username"
                    name="username"
                    required
                    minLength={3}
                    maxLength={30}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Nom affiché</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  maxLength={DISPLAY_NAME_MAX}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headline">Titre</Label>
                <Input
                  id="headline"
                  name="headline"
                  maxLength={HEADLINE_MAX}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </div>
              {state.error && (
                <p role="alert" className="text-sm text-red-600">
                  {state.error}
                </p>
              )}
              {state.saved && (
                <p role="status" className="text-sm text-green-700">
                  Profil enregistré.
                </p>
              )}
              <Button type="submit" disabled={pending}>
                Enregistrer
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card aria-label="Aperçu public">
          <CardHeader>
            <CardTitle>Aperçu public</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">mywork.website/{username.trim().toLowerCase()}</p>
            <p data-testid="preview-name" className="text-2xl font-semibold">
              {displayName.trim() || username.trim().toLowerCase()}
            </p>
            {headline.trim() && (
              <p data-testid="preview-headline" className="text-muted-foreground">
                {headline.trim()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
