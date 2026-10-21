"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getInitials } from "@/lib/profile-sections";
import { removeAvatar, uploadAvatar, type FormState } from "./actions";

type Props = {
  avatarUrl: string | null;
  displayName: string;
  username: string;
};

export function AvatarForm({ avatarUrl, displayName, username }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadAvatar, {});
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const initials = getInitials(displayName, username);

  async function handleRemove() {
    setRemoving(true);
    setRemoveError(null);
    const res = await removeAvatar();
    if (res.error) setRemoveError(res.error);
    setRemoving(false);
  }

  const errorMessage = state.error ?? removeError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName || username}
              width={64}
              height={64}
              className="size-16 shrink-0 rounded-full border object-cover"
            />
          ) : (
            <div
              aria-label="Initiales"
              className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-muted font-heading text-xl text-muted-foreground"
            >
              {initials}
            </div>
          )}

          <form action={action} className="flex flex-1 flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1 space-y-2">
              <Label htmlFor="avatar">Fichier image (JPEG, PNG ou WebP, 2 Mo max)</Label>
              <Input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                Envoyer
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={removing}
                  onClick={handleRemove}
                >
                  Retirer
                </Button>
              )}
            </div>
          </form>
        </div>

        {errorMessage && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        {state.saved && !errorMessage && (
          <Alert variant="success" role="status">
            <AlertDescription>Photo enregistrée.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
