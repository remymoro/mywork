"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DriveError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto max-w-xl space-y-4 p-8">
      <Alert variant="destructive">
        <AlertTitle>Impossible de charger tes fichiers</AlertTitle>
        <AlertDescription>Vérifie ta connexion, puis réessaie.</AlertDescription>
      </Alert>
      <Button onClick={retry}>Réessayer</Button>
    </main>
  );
}
