"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
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
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>mywork.website/</span>
          <Input id="username" name="username" required minLength={3} maxLength={30} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="display_name">Nom affiché</Label>
        <Input id="display_name" name="display_name" maxLength={80} />
      </div>
      {state.error && <Alert variant="destructive">{state.error}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        Créer mon profil
      </Button>
    </form>
  );
}
