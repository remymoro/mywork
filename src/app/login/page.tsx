import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleButton } from "./google-button";

async function LoginError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-red-600">
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
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Se connecter à MyWork</CardTitle>
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
