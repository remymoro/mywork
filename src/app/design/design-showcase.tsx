"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SECTION_HEADER, SECTION_TITLE } from "@/app/dashboard/profil/section-style";
import { MODE_STORAGE_KEY } from "@/lib/appearance";
import { DesignArchives } from "./design-archives";
import { DesignComponents } from "./design-components";

const TOKENS = [
  { name: "background", usage: "Fond de page", classes: "bg-background text-foreground" },
  { name: "foreground", usage: "Texte principal", classes: "bg-foreground text-background" },
  { name: "card", usage: "Cartes et formulaires", classes: "bg-card text-card-foreground" },
  { name: "primary", usage: "Carmin : actions et repères actifs", classes: "bg-primary text-primary-foreground" },
  { name: "secondary", usage: "Badges discrets", classes: "bg-secondary text-secondary-foreground" },
  { name: "muted", usage: "Surfaces et textes secondaires", classes: "bg-muted text-muted-foreground" },
  { name: "accent", usage: "Survols et menus", classes: "bg-accent text-accent-foreground" },
  { name: "border", usage: "Filets et contours", classes: "bg-background border-border border-4 text-foreground" },
  { name: "sidebar", usage: "Barre des modules", classes: "bg-sidebar text-sidebar-foreground" },
  { name: "success", usage: "Disponibilité et confirmations", classes: "bg-success text-success-foreground" },
  { name: "destructive", usage: "Erreurs et suppression", classes: "bg-destructive text-white" },
] as const;

export function TokenPalette() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {TOKENS.map((token) => (
        <div key={token.name} className="space-y-2 rounded-lg border bg-card p-3">
          <div className={`flex h-12 items-center rounded-md px-3 text-sm ${token.classes}`}>
            {token.name}
          </div>
          <p className="text-sm">{token.usage}</p>
          <code className="block text-xs leading-relaxed break-words text-muted-foreground">
            {token.classes}
          </code>
        </div>
      ))}
    </div>
  );
}

function subscribeMode(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function DesignShowcase({ patterns }: { patterns: ReactNode }) {
  // Suit aussi le mode mémorisé, appliqué par layout.tsx avant l'affichage.
  const isDark = useSyncExternalStore(
    subscribeMode,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

  function changeMode(dark: boolean) {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, dark ? "dark" : "light");
    } catch {
      // Comme dans le menu utilisateur, le mode reste utilisable sans stockage local.
    }
  }

  return (
    <div className="space-y-16">
      <section
        aria-labelledby="systeme-retenu"
        data-testid="design-current-system"
        data-theme="editorial"
        className="space-y-10"
      >
        <div className="flex flex-wrap items-start justify-between gap-6 border-b pb-6">
          <div className="max-w-2xl space-y-3">
            <h2 id="systeme-retenu" className="font-heading text-3xl">
              Système retenu : Éditorial
            </h2>
            <p className="text-sm text-muted-foreground">
              D22 acté le 2026-10-21 : fond crème, titres Newsreader, texte Geist
              et accent carmin. Le logo « Pages », un livre ouvert, apparaît dans
              l’en-tête de l’espace privé, à la connexion et sur le profil public.
            </p>
            <Logo />
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <Switch
              id="design-mode"
              checked={isDark}
              onCheckedChange={changeMode}
              aria-label="Afficher le système retenu en mode sombre"
            />
            <Label htmlFor="design-mode">{isDark ? "Sombre" : "Clair"}</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Dans l’application : menu utilisateur → Thème → Clair / Sombre.
            Ce choix est mémorisé dans le navigateur et s’applique aussi à cette page.
          </p>
        </div>

        <section aria-labelledby="couleurs" className="space-y-4">
          <h3 id="couleurs" className="font-heading text-2xl">Couleurs utilisées</h3>
          <p className="text-sm text-muted-foreground">
            Les jetons de globals.css alimentent ces exemples en clair et en sombre.
            Les classes ci-dessous s’utilisent dans toute l’application ; le carmin
            sert aux actions, le vert aux validations.
          </p>
          <TokenPalette />
          <p className="text-sm text-muted-foreground">
            Champs : <code>border-input</code>. Focus clavier : <code>border-ring ring-ring/50</code>.
            Menus flottants : <code>bg-popover text-popover-foreground</code>.
            Barre latérale : <code>border-sidebar-border hover:bg-sidebar-accent</code>.
          </p>
        </section>

        <section aria-labelledby="typographie" className="space-y-4">
          <h3 id="typographie" className="font-heading text-2xl">Typographie</h3>
          <p className="text-sm text-muted-foreground">
            Newsreader pour les titres (<code>font-heading</code>), Geist pour le texte
            et les contrôles (<code>font-sans</code>), chargées dans layout.tsx.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-xl border p-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                ESPACE PRIVÉ
              </p>
              <p className="font-heading text-3xl font-normal tracking-tight sm:text-4xl">
                Mon profil
              </p>
              <p className="text-sm text-muted-foreground">Choisis ce que les visiteurs voient sur ta page.</p>
              <code className="block text-xs text-muted-foreground">
                text-xs uppercase tracking-[0.2em] · font-heading text-3xl sm:text-4xl
              </code>
            </div>
            <Card>
              <CardHeader className={SECTION_HEADER}>
                <CardTitle className={SECTION_TITLE}>Offre freelance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>Carte de section de « Mon profil » : titre serif et filet.</p>
                <code className="block text-xs text-muted-foreground">SECTION_HEADER : {SECTION_HEADER}</code>
                <code className="block text-xs text-muted-foreground">SECTION_TITLE : {SECTION_TITLE}</code>
              </CardContent>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">
            Sur le profil public, « À PROPOS » utilise aussi <code>text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground</code>.
            Son exemple réel figure dans l’aperçu de page ci-dessous.
          </p>
        </section>

        <DesignComponents isDark={isDark} onModeChange={changeMode} />
        {patterns}
      </section>

      <DesignArchives isDark={isDark} palette={<TokenPalette />} />
    </div>
  );
}
