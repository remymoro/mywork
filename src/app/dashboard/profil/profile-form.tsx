"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initials } from "@/lib/profile";
import { updateProfile, type ProfileState } from "./actions";

export type ProfileData = {
  username: string;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  avatar_url: string | null;
};

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});
  const name = profile.display_name ?? profile.username;

  return (
    <form action={action} className="space-y-8">
      <section className="flex items-center gap-4">
        <Avatar size="xl">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <Label htmlFor="avatar">Photo de profil</Label>
          <Input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" />
          <p className="text-sm text-muted-foreground">JPEG, PNG ou WebP, 2 Mo maximum.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Identité</h2>
        <Field id="display_name" label="Nom affiché">
          <Input id="display_name" name="display_name" maxLength={80} defaultValue={profile.display_name ?? ""} />
        </Field>
        <Field id="headline" label="Titre" hint="Ex. : Développeuse web freelance">
          <Input id="headline" name="headline" maxLength={120} defaultValue={profile.headline ?? ""} />
        </Field>
        <Field id="bio" label="Présentation" hint="500 caractères maximum.">
          <Textarea id="bio" name="bio" maxLength={500} rows={4} defaultValue={profile.bio ?? ""} />
        </Field>
        <Field id="location" label="Localisation" hint="Ex. : Lyon, France">
          <Input id="location" name="location" maxLength={80} defaultValue={profile.location ?? ""} />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Liens</h2>
        <Field id="website" label="Site web">
          <Input id="website" name="website" inputMode="url" placeholder="monsite.fr" defaultValue={profile.website ?? ""} />
        </Field>
        <Field id="linkedin_url" label="LinkedIn">
          <Input id="linkedin_url" name="linkedin_url" inputMode="url" placeholder="linkedin.com/in/…" defaultValue={profile.linkedin_url ?? ""} />
        </Field>
        <Field id="github_url" label="GitHub">
          <Input id="github_url" name="github_url" inputMode="url" placeholder="github.com/…" defaultValue={profile.github_url ?? ""} />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Adresse publique</h2>
        <Field
          id="username"
          label="Pseudo"
          hint="Si tu le changes, l'ancienne adresse redirige vers la nouvelle."
        >
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>mywork.website/</span>
            <Input id="username" name="username" required minLength={3} maxLength={30} defaultValue={profile.username} />
          </div>
        </Field>
      </section>

      {state.error && <Alert variant="destructive">{state.error}</Alert>}
      {state.saved && <Alert variant="success">Profil enregistré.</Alert>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
