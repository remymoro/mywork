"use client";

import { useState, type ReactNode } from "react";
import { LogoCarre, LogoMonogramme, LogoMTypo, LogoNomSeul, LogoPages } from "@/components/logo-variants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const THEMES = [
  {
    id: "neutral",
    label: "A · Neutre",
    description: "Noir et pierre : première piste sobre de D20, remplacée par D22.",
  },
  {
    id: "blue",
    label: "B · Bleu Ardoise",
    description: "Indigo professionnel : actions bleues et surfaces ardoise.",
  },
  {
    id: "warm",
    label: "C · Sauge & Argile",
    description: "Fond papier, vert sauge et nuances chaudes.",
  },
  {
    id: "editorial",
    label: "D · Éditorial",
    description: "Piste retenue (D22) : crème, titres Newsreader et accent carmin. Logo retenu : Pages.",
  },
] as const;

type Theme = (typeof THEMES)[number]["id"];

const LOGOS = [
  { name: "Monogramme", Component: LogoMonogramme, description: "Initiales M et W réunies." },
  { name: "M typographique", Component: LogoMTypo, description: "Une initiale serif en carmin." },
  { name: "Pages", Component: LogoPages, description: "Logo retenu : le livre ouvert du profil professionnel." },
  { name: "Nom seul", Component: LogoNomSeul, description: "Le nom en carmin et encre." },
  { name: "Carré M", Component: LogoCarre, description: "Ancien logo, conservé pour comparaison." },
] as const;

export function DesignArchives({ isDark, palette }: { isDark: boolean; palette: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("neutral");

  return (
    <section aria-labelledby="archives" className="space-y-6 border-t pt-10">
      <div className="space-y-3">
        <h2 id="archives" className="font-heading text-3xl">
          Archives : pistes comparées le 2026-10-21
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          De D20 à D22 : quatre variantes et les pistes de logo conservées pour
          comparaison. D Éditorial et le logo Pages sont retenus. Ces onglets
          changent seulement l’aperçu d’archives ; l’application reste en Éditorial.
        </p>
      </div>
      <Tabs
        value={theme}
        onValueChange={(value) => {
          if (THEMES.some((option) => option.id === value)) setTheme(value as Theme);
        }}
        className="space-y-4"
      >
        <TabsList aria-label="Pistes visuelles archivées" className="h-auto flex-wrap">
          {THEMES.map((option) => (
            <TabsTrigger key={option.id} value={option.id}>
              {option.label}{option.id === "editorial" ? " · Retenue" : ""}
            </TabsTrigger>
          ))}
        </TabsList>
        {THEMES.map((option) => (
          <TabsContent key={option.id} value={option.id}>
            <p className="text-sm text-muted-foreground">{option.description}</p>
          </TabsContent>
        ))}
      </Tabs>

      <div
        data-testid="design-demo-container"
        data-theme={theme}
        className={isDark ? "dark" : ""}
      >
        <div className="space-y-8 rounded-xl border bg-background p-6 text-foreground">
          <div className="space-y-2">
            <p className="font-heading text-3xl">Un profil, un parcours</p>
            <p className="text-sm text-muted-foreground">
              {theme === "editorial" ? "Newsreader" : "Geist"} pour les titres · Geist pour le texte.
              Aperçu {isDark ? "sombre" : "clair"}, selon le mode choisi en haut de la page.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button>Enregistrer</Button>
              <Button variant="outline">Annuler</Button>
              <Badge variant="secondary">Bientôt</Badge>
            </div>
          </div>
          {palette}
          <section aria-labelledby="logos-archives" className="space-y-4">
            <h3 id="logos-archives" className="font-heading text-2xl">Logos</h3>
            <p className="text-sm text-muted-foreground">
              Même composant à grande et petite taille, comme dans la barre de l’application.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {LOGOS.map(({ name, Component, description }) => (
                <Card key={name}>
                  <CardHeader>
                    <CardTitle>{name}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                    {name === "Pages" && <Badge variant="success">Logo retenu</Badge>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex min-h-24 items-center rounded-lg border bg-background px-5">
                      <Component className="text-4xl" />
                    </div>
                    <div className="flex min-h-14 items-center justify-between gap-4 rounded-lg border bg-sidebar px-4 text-sidebar-foreground">
                      <span className="text-xs text-muted-foreground">Barre latérale</span>
                      <Component className="text-sm" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
