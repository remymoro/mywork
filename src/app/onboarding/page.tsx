import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

// Page dépendante de la session ou de l'URL : elle bloque côté serveur (voir docs/decisions.md).
export const instant = false;

export default async function OnboardingPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profile) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6 text-foreground">
      <Logo />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Bienvenue sur MyWork</CardTitle>
          <CardDescription>Choisis ton pseudo : tu pourras le changer plus tard.</CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </main>
  );
}
