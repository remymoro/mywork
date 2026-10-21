"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DISPLAY_NAME_MAX, HEADLINE_MAX } from "@/lib/profile";
import { updateProfile, type ProfileState } from "./profile-actions";
import { SECTION_HEADER, SECTION_TITLE } from "./profil/section-style";

type Props = { username: string; displayName: string; headline: string };

export function ProfileEditor(initial: Props) {
  const [username, setUsername] = useState(initial.username);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [headline, setHeadline] = useState(initial.headline);
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className={SECTION_HEADER}>
            <CardTitle className={SECTION_TITLE}>En-tête</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Pseudo</Label>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center">
                  <span>mywork.website/</span>
                  <Input
                    id="username"
                    name="username"
                    required
                    minLength={3}
                    maxLength={30}
                    className="flex-1"
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
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}
              {state.saved && (
                <Alert variant="success" role="status">
                  <AlertDescription>Profil enregistré.</AlertDescription>
                </Alert>
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
