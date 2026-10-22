import type { Metadata } from "next";
import Link from "next/link";
import { DriveDemo } from "@/components/drive/drive-demo";
import { Logo } from "@/components/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Aperçu du Drive — MyWork",
  description: "Le Drive de MyWork avec de fausses données, sans connexion ni base de données.",
  robots: { index: false },
};

export default function DriveDemoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Accueil MyWork">
              <Logo />
            </Link>
            <Badge variant="secondary">Aperçu</Badge>
          </div>
          <Link href="/design" className="text-sm text-muted-foreground hover:text-foreground">
            Système de design
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">ESPACE PRIVÉ</p>
          <h1 className="font-heading text-3xl font-normal tracking-tight sm:text-4xl">Mes fichiers</h1>
        </div>
        <Alert role="status">
          <AlertDescription>
            Aperçu avec de <strong>fausses données</strong> : essaie tout (dossiers, import, tri, public / privé).
            Rien n’est envoyé ni enregistré, et tout revient à zéro quand tu recharges la page.
          </AlertDescription>
        </Alert>
        <DriveDemo />
      </main>
    </div>
  );
}
