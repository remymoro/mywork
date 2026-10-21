import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { DesignShowcase } from "./design-showcase";
import { DesignPatterns } from "./design-patterns";

export const metadata: Metadata = {
  title: "Système de design — MyWork",
  description:
    "Le système Éditorial utilisé dans MyWork : couleurs, typographie, composants et archives des pistes visuelles.",
};

export default function DesignPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Accueil MyWork">
              <Logo />
            </Link>
            <Badge variant="secondary">Système de design</Badge>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Tableau de bord
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Connexion
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-normal tracking-tight sm:text-4xl">
            Système de design MyWork
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Les couleurs, les textes et les composants réellement utilisés dans
            l’application aujourd’hui. Les pistes comparées avant le choix
            d’Éditorial sont conservées dans les archives en bas de page.
          </p>
        </div>

        <DesignShowcase patterns={<DesignPatterns />} />
      </main>
    </div>
  );
}
