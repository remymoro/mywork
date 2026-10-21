"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProfile, type OnboardingState } from "./actions";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createProfile, {});

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Pseudo (ton adresse publique)</Label>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <span>mywork.website/</span>
          <Input id="username" name="username" required minLength={3} maxLength={30} className="flex-1" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="display_name">Nom affiché</Label>
        <Input id="display_name" name="display_name" maxLength={80} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        Créer mon profil
      </Button>
    </form>
  );
}
