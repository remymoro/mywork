import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { GoogleButton } from "./google-button";

async function LoginError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      La connexion a échoué. Réessaie.
    </p>
  );
}

// Page dépendante de la session ou de l'URL : elle bloque côté serveur (voir docs/decisions.md).
export const instant = false;

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6 text-foreground">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Se connecter</CardTitle>
          <CardDescription>Un seul clic avec ton compte Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <GoogleButton />
          <Suspense>
            <LoginError searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
