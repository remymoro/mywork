import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleButton } from "./google-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Se connecter à MyWork</CardTitle>
          <CardDescription>Un seul clic avec ton compte Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <GoogleButton />
          {error && (
            <p role="alert" className="text-sm text-red-600">
              La connexion a échoué. Réessaie.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
