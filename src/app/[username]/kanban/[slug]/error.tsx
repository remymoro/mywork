"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function PublicKanbanError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto max-w-xl space-y-4 p-8">
      <Alert variant="destructive">
        <AlertTitle>Impossible de charger ce tableau</AlertTitle>
        <AlertDescription>Vérifie ta connexion, puis réessaie.</AlertDescription>
      </Alert>
      <Button onClick={retry}>Réessayer</Button>
    </main>
  );
}
