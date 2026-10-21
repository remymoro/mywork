"use client";

import { useState } from "react";
import { LayoutGrid, User } from "lucide-react";
import { Logo } from "@/components/logo";
import {
  LogoMTypo,
  LogoMonogramme,
  LogoNomSeul,
  LogoPages,
  LogoCarre,
} from "@/components/logo-variants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MODULES } from "@/app/dashboard/modules";

type ThemeVariant = "neutral" | "blue" | "warm" | "editorial";

const THEME_OPTIONS: {
  id: ThemeVariant;
  label: string;
  subtitle: string;
  description: string;
}[] = [
  {
    id: "neutral",
    label: "A · Neutre (Noir & Pierre)",
    subtitle: "Sobriété éditoriale",
    description:
      "Continuité directe du style actuel (D20) : contrastes francs noir et blanc, gris pierre subtils, sans couleur de marque dominante. Idéal pour laisser le contenu du CV au premier plan.",
  },
  {
    id: "blue",
    label: "B · Bleu Ardoise (Indigo Pro)",
    subtitle: "Clarté et confiance SaaS",
    description:
      "Un bleu indigo profond pour les actions principales et une teinte ardoise douce pour les survols et badges. Apporte un repère visuel immédiat sur les boutons et liens actifs.",
  },
  {
    id: "warm",
    label: "C · Sauge & Argile (Chaleur Naturelle)",
    subtitle: "Approche humaine et posée",
    description:
      "Fond papier légèrement crème et couleur principale vert sauge profond. Donne une identité singulière, calme et chaleureuse au profil public comme au tableau de bord.",
  },
  {
    id: "editorial",
    label: "D · Éditorial (Crème, Serif & Carmin)",
    subtitle: "Caractère presse & édition",
    description:
      "Fond crème très clair, grands titres en serif éditorial (Newsreader), barre latérale séparée par un filet fin et accents rouge brique/carmin sobres (logo carré et liseré vertical actif).",
  },
];

const TOKENS = [
  {
    name: "background",
    label: "Fond de page",
    swatchClass: "bg-background border",
    textClass: "text-foreground",
  },
  {
    name: "card",
    label: "Surface de carte",
    swatchClass: "bg-card border",
    textClass: "text-card-foreground",
  },
  {
    name: "primary",
    label: "Action principale",
    swatchClass: "bg-primary",
    textClass: "text-primary-foreground",
  },
  {
    name: "secondary",
    label: "Action secondaire",
    swatchClass: "bg-secondary border",
    textClass: "text-secondary-foreground",
  },
  {
    name: "accent",
    label: "Mise en avant (Accent)",
    swatchClass: "bg-accent border",
    textClass: "text-accent-foreground",
  },
  {
    name: "muted",
    label: "Surface discrète",
    swatchClass: "bg-muted border",
    textClass: "text-muted-foreground",
  },
  {
    name: "success",
    label: "Validation (Succès)",
    swatchClass: "bg-success",
    textClass: "text-success-foreground",
  },
  {
    name: "warning",
    label: "Avertissement",
    swatchClass: "bg-warning",
    textClass: "text-warning-foreground",
  },
  {
    name: "destructive",
    label: "Erreur / Danger",
    swatchClass: "bg-destructive",
    textClass: "text-white",
  },
  {
    name: "sidebar",
    label: "Barre latérale",
    swatchClass: "bg-sidebar border",
    textClass: "text-sidebar-foreground",
  },
] as const;

const LOGO_VARIANTS = [
  {
    name: "Monogramme",
    idea: "Un signe compact et une signature complète, pour une identité immédiatement reconnaissable.",
    Component: LogoMonogramme,
  },
  {
    name: "M typographique",
    idea: "Une initiale forte donne du caractère au nom sans l’enfermer dans un cadre.",
    Component: LogoMTypo,
  },
  {
    name: "Pages",
    idea: "Un livre ouvert évoque les parcours, les projets et les histoires professionnelles.",
    Component: LogoPages,
  },
  {
    name: "Nom seul",
    idea: "Le contraste entre carmin et encre fait porter toute l’identité par le nom.",
    Component: LogoNomSeul,
  },
] as const;

export function DesignShowcase() {
  const [theme, setTheme] = useState<ThemeVariant>("neutral");
  const [isDark, setIsDark] = useState(false);
  const [demoName, setDemoName] = useState("Rémy Moro");
  const [demoHeadline, setDemoHeadline] = useState(
    "Consultant produit & accompagnement numérique",
  );
  const [demoBio, setDemoBio] = useState(
    "J’accompagne les équipes dans la structuration de leurs projets web, de l’idée initiale à la mise en ligne.",
  );
  const [availableForRdv, setAvailableForRdv] = useState(true);

  function handleTabChange(value: unknown) {
    if (
      value === "neutral" ||
      value === "blue" ||
      value === "warm" ||
      value === "editorial"
    ) {
      setTheme(value);
    }
  }

  const isEditorial = theme === "editorial";

  return (
    <div className="space-y-8">
      {/* Barre de contrôle : Tabs pour les 4 variantes + Switch clair/sombre */}
      <Tabs value={theme} onValueChange={handleTabChange} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Variante de palette
            </p>
            <TabsList className="flex-wrap h-auto">
              {THEME_OPTIONS.map((option) => (
                <TabsTrigger key={option.id} value={option.id}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <Switch
              id="demo-dark-mode"
              checked={isDark}
              onCheckedChange={(checked) => setIsDark(Boolean(checked))}
              aria-label="Basculer le conteneur de démo en mode sombre"
            />
            <Label htmlFor="demo-dark-mode" className="cursor-pointer text-sm">
              {isDark ? "Mode sombre actif" : "Mode clair actif"}
            </Label>
          </div>
        </div>

        {THEME_OPTIONS.map((option) => (
          <TabsContent
            key={option.id}
            value={option.id}
            className="rounded-xl border bg-muted/40 p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">{option.label}</h2>
              <span className="text-xs font-medium text-muted-foreground">
                {option.subtitle}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {option.description}
            </p>
          </TabsContent>
        ))}
      </Tabs>

      {/* Conteneur de démonstration isolé qui reçoit data-theme et la classe .dark */}
      <div
        data-testid="design-demo-container"
        data-theme={theme}
        className={isDark ? "dark" : ""}
      >
        <div className="space-y-10 rounded-2xl border bg-background p-6 text-foreground shadow-sm transition-colors sm:p-8">
          {/* 1. Nuancier des jetons */}
          <section aria-labelledby="section-tokens" className="space-y-4">
            <div className="space-y-1">
              <h2 id="section-tokens" className="text-lg font-semibold">
                1. Nuancier des jetons
              </h2>
              <p className="text-sm text-muted-foreground">
                Couleurs sémantiques et typographie de titrage appliquées
                automatiquement aux composants selon la variante et le mode
                choisis.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
              {TOKENS.map((token) => (
                <div
                  key={token.name}
                  className="flex flex-col justify-between rounded-xl border bg-card p-3 text-card-foreground"
                >
                  <div
                    className={`flex h-12 items-center justify-center rounded-lg px-2 text-xs font-medium ${token.swatchClass} ${token.textClass}`}
                  >
                    --{token.name}
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-semibold">{token.label}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {token.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 text-card-foreground">
              <div className="space-y-1">
                <p className="text-xs font-semibold">
                  Typographie des titres (--font-heading)
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {isEditorial
                    ? "var(--font-serif) · Newsreader (Éditorial)"
                    : "var(--font-sans) · Geist Sans"}
                </p>
              </div>
              <p
                className="text-2xl tracking-tight text-foreground"
                style={{
                  fontFamily: "var(--font-heading, var(--font-sans))",
                }}
              >
                Tableau de bord · Aa Bb Cc
              </p>
            </div>
          </section>

          <Separator />

          <section aria-labelledby="section-logos" className="space-y-4">
            <div className="space-y-1">
              <h2 id="section-logos" className="font-heading text-lg font-semibold">
                Logos
              </h2>
              <p className="text-sm text-muted-foreground">
                Quatre pistes à comparer avec le logo actuel. La petite taille
                correspond à son usage dans la barre latérale.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {LOGO_VARIANTS.map(({ name, idea, Component }) => (
                <Card key={name}>
                  <CardHeader>
                    <CardTitle>{name}</CardTitle>
                    <CardDescription>{idea}</CardDescription>
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
              <Card>
                <CardHeader>
                  <CardTitle>Ancien logo (carré) · référence</CardTitle>
                  <CardDescription>
                    Le M blanc dans son carré carmin, suivi du nom en graisse forte.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex min-h-24 items-center rounded-lg border bg-background px-5">
                    <LogoCarre />
                  </div>
                  <div className="flex min-h-14 items-center justify-between gap-4 rounded-lg border bg-sidebar px-4 text-sidebar-foreground">
                    <span className="text-xs text-muted-foreground">Barre latérale</span>
                    <div className="origin-right scale-75"><LogoCarre /></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* 2. Composants en situation */}
          <section aria-labelledby="section-components" className="space-y-6">
            <div className="space-y-1">
              <h2 id="section-components" className="text-lg font-semibold">
                2. Composants en situation
              </h2>
              <p className="text-sm text-muted-foreground">
                Les 8 nouveaux composants (Badge, Alert, Textarea, Separator,
                Tabs, Dialog, Switch, Avatar) combinés aux briques existantes.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Boutons, badges et états</CardTitle>
                  <CardDescription>
                    Hiérarchie des actions et étiquettes de statut pour les
                    modules.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Boutons
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button>Action principale</Button>
                      <Button variant="secondary">Secondaire</Button>
                      <Button variant="outline">Contour</Button>
                      <Button variant="ghost">Discret</Button>
                      <Button variant="destructive">Supprimer</Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Badges (avec variantes accent et success)
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>Principal</Badge>
                      <Badge variant="secondary">Bientôt</Badge>
                      <Badge variant="accent">Nouveau module</Badge>
                      <Badge variant="success">En ligne</Badge>
                      <Badge variant="outline">Brouillon</Badge>
                      <Badge variant="destructive">Indisponible</Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Messages de retour (Alert)
                    </p>
                    <Alert variant="success" role="status">
                      <AlertTitle>Enregistrement réussi</AlertTitle>
                      <AlertDescription>Profil enregistré.</AlertDescription>
                    </Alert>
                    <Alert variant="destructive" role="alert">
                      <AlertTitle>Pseudo indisponible</AlertTitle>
                      <AlertDescription>
                        Ce pseudo est déjà réservé par un autre utilisateur.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Éléments de profil & fenêtre modale</CardTitle>
                  <CardDescription>
                    Avatar, zone de texte multi-lignes, interrupteur et boîte de
                    dialogue.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar size="lg">
                      <AvatarFallback>RM</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{demoName || "remy"}</p>
                      <p className="text-xs text-muted-foreground">
                        mywork.website/remy
                      </p>
                    </div>
                    <Badge variant="success" className="ml-auto">
                      Profil actif
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demo-bio">Présentation (Textarea)</Label>
                    <Textarea
                      id="demo-bio"
                      value={demoBio}
                      onChange={(e) => setDemoBio(e.target.value)}
                      placeholder="Décris ton parcours en quelques lignes…"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="demo-rdv-switch">
                        Autoriser la prise de rendez-vous
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Affiche un bouton de réservation sur ton profil public.
                      </p>
                    </div>
                    <Switch
                      id="demo-rdv-switch"
                      checked={availableForRdv}
                      onCheckedChange={(checked) =>
                        setAvailableForRdv(Boolean(checked))
                      }
                    />
                  </div>

                  <div className="pt-1">
                    <Dialog>
                      <DialogTrigger render={<Button variant="outline" />}>
                        Ouvrir la fenêtre de partage (Dialog)
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Partager mon profil public</DialogTitle>
                          <DialogDescription>
                            Toute personne disposant de ce lien peut consulter
                            ta page publique MyWork.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-lg border bg-muted/50 px-3 py-2 font-mono text-xs">
                          https://mywork.website/remy
                        </div>
                        <DialogFooter showCloseButton>
                          <Button type="button">Copier l’adresse</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* 3. Aperçu du tableau de bord */}
          <section aria-labelledby="section-dashboard" className="space-y-4">
            <div className="space-y-1">
              <h2 id="section-dashboard" className="text-lg font-semibold">
                3. Aperçu du tableau de bord
              </h2>
              <p className="text-sm text-muted-foreground">
                Rendu du tableau de bord MyWork (barre latérale + édition +
                aperçu en direct) avec la variante sélectionnée.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border bg-background shadow-xs">
              <div className="flex flex-col md:flex-row">
                <aside className="w-full shrink-0 space-y-6 border-b border-sidebar-border bg-sidebar p-5 text-sidebar-foreground md:w-60 md:border-r md:border-b-0">
                  {/* Logo : carré primary M + yWork (via composant partagé Logo) */}
                  <div className="flex items-center justify-between">
                    <Logo />
                  </div>

                  <ul className="space-y-1">
                    <li>
                      <span
                        className={
                          isEditorial
                            ? "flex items-center gap-3 border-l-[3px] border-primary bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground"
                            : "flex items-center gap-3 rounded-md bg-sidebar-primary px-3 py-2 text-sm font-medium text-sidebar-primary-foreground"
                        }
                      >
                        <LayoutGrid
                          className="size-4 shrink-0"
                          strokeWidth={1.5}
                        />
                        <span>Tableau de bord</span>
                      </span>
                    </li>
                    <li>
                      <span className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground">
                        <User className="size-4 shrink-0" strokeWidth={1.5} />
                        <span>Mon profil</span>
                      </span>
                    </li>
                  </ul>

                  <div className="space-y-2 pt-2">
                    <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Bientôt
                    </p>
                    <ul className="space-y-1">
                      {MODULES.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-muted-foreground"
                        >
                          <span>{m.label}</span>
                          <Badge variant="secondary">Bientôt</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>

                <div className="flex-1 space-y-6 p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        ESPACE PRIVÉ
                      </p>
                      <h3
                        className="text-3xl font-normal tracking-tight text-foreground sm:text-4xl"
                        style={{
                          fontFamily: "var(--font-heading, var(--font-sans))",
                        }}
                      >
                        Tableau de bord
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Futures informations sur mon espace.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="accent">Aperçu {theme}</Badge>
                      <Button variant="outline" size="sm" type="button">
                        Se déconnecter
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 text-sm">
                    <span>
                      Ton adresse publique :{" "}
                      <strong>mywork.website/remy</strong>
                    </span>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm">
                        Copier le lien
                      </Button>
                      <Button type="button" variant="outline" size="sm">
                        Voir ma page
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Éditer mon profil</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="preview-display-name">
                            Nom affiché
                          </Label>
                          <Input
                            id="preview-display-name"
                            value={demoName}
                            onChange={(e) => setDemoName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="preview-headline-input">Titre</Label>
                          <Input
                            id="preview-headline-input"
                            value={demoHeadline}
                            onChange={(e) => setDemoHeadline(e.target.value)}
                          />
                        </div>
                        <Alert variant="success" role="status">
                          <AlertDescription>
                            Profil enregistré.
                          </AlertDescription>
                        </Alert>
                        <Button type="button">Enregistrer</Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Aperçu public</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Avatar size="lg">
                            <AvatarFallback>RM</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              mywork.website/remy
                            </p>
                            <p
                              className="text-xl font-semibold"
                              style={{
                                fontFamily:
                                  "var(--font-heading, var(--font-sans))",
                              }}
                            >
                              {demoName.trim() || "remy"}
                            </p>
                          </div>
                        </div>
                        {demoHeadline.trim() && (
                          <p className="text-sm text-muted-foreground">
                            {demoHeadline.trim()}
                          </p>
                        )}
                        {demoBio.trim() && (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {demoBio.trim()}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Badge variant="accent">CV complet</Badge>
                          {availableForRdv && (
                            <Badge variant="success">
                              Disponible pour un RDV
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
