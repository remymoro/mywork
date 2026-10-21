"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronsUpDown,
  ExternalLink,
  Eye,
  EyeOff,
  ListOrdered,
  Minus,
  Pencil,
  Trash2,
} from "lucide-react";
import { ExperienceFields, formatExperienceSummary, type ExperienceRow } from "@/app/dashboard/profil/experience-fields";
import { PROFILE_SECTIONS, type ProfileSectionId } from "@/app/dashboard/profil/profile-sections-nav";
import { SECTION_HEADER, SECTION_TITLE } from "@/app/dashboard/profil/section-style";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FREELANCE_AVAILABILITY, moveInList } from "@/lib/profile-sections";

const DEMO_EXPERIENCES: ExperienceRow[] = [
  {
    id: "demo-conseil",
    position: 0,
    is_visible: true,
    title: "Consultante produit",
    company: "Atelier Exemple",
    employment_type: "freelance",
    location: "Lyon",
    work_mode: "teletravail",
    start_date: "2024-01-01",
    end_date: null,
    is_current: true,
    description: "J’accompagne les équipes dans leurs projets numériques.",
    skills: ["Produit", "Design"],
  },
  {
    id: "demo-projet",
    position: 1,
    is_visible: false,
    title: "Cheffe de projet",
    company: "Studio Exemple",
    employment_type: "cdi",
    location: "Paris",
    work_mode: "hybride",
    start_date: "2020-01-01",
    end_date: "2023-12-01",
    is_current: false,
    description: null,
    skills: [],
  },
];

function Example({ title, usage, children }: { title: string; usage: string; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">{usage}</p>
      </div>
      {children}
    </div>
  );
}

function ListExample() {
  const [items, setItems] = useState(DEMO_EXPERIENCES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <Example
      title="Ligne de liste et Dialog de suppression"
      usage="Expériences, projets, formation, langues, certifications et prestations. Les boutons ghost icon-sm modifient, masquent, déplacent ou suppriment un élément."
    >
      <ul className="space-y-2" aria-label="Expériences de démonstration">
        {items.map((item, index) => (
          <li key={item.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={item.is_visible ? "text-sm font-medium" : "text-sm text-muted-foreground opacity-60"}>
                  {formatExperienceSummary(item)}
                </span>
                {!item.is_visible && <Badge variant="secondary">Masqué</Badge>}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Modifier"
                  onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={item.is_visible ? "Masquer" : "Afficher"}
                  onClick={() => setItems(items.map((row) => (
                    row.id === item.id ? { ...row, is_visible: !row.is_visible } : row
                  )))}
                >
                  {item.is_visible ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Monter"
                  disabled={index === 0}
                  onClick={() => setItems(moveInList(items, index, index - 1))}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Descendre"
                  disabled={index === items.length - 1}
                  onClick={() => setItems(moveInList(items, index, index + 1))}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Supprimer"
                  onClick={() => setDeletingId(item.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
            {editingId === item.id && (
              <form
                className="space-y-4 rounded-lg border bg-muted/20 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  setItems(items.map((row) => row.id === item.id ? {
                    ...row,
                    title: String(data.get("title")),
                    company: String(data.get("company")),
                    employment_type: String(data.get("employment_type")),
                    location: String(data.get("location")),
                    work_mode: String(data.get("work_mode")),
                    start_date: `${data.get("start_date")}-01`,
                    end_date: data.get("end_date") ? `${data.get("end_date")}-01` : null,
                    is_current: data.get("is_current") === "on",
                    description: String(data.get("description")),
                    skills: String(data.get("skills")).split(",").map((skill) => skill.trim()).filter(Boolean),
                  } : row));
                  setEditingId(null);
                }}
              >
                <ExperienceFields item={item} />
                <div className="flex gap-2">
                  <Button type="submit">Enregistrer l’exemple</Button>
                  <Button variant="outline" onClick={() => setEditingId(null)}>Annuler</Button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        onClick={() => {
          setItems(DEMO_EXPERIENCES);
          setEditingId(null);
        }}
      >
        Réinitialiser la liste
      </Button>
      <Dialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Supprimer cet élément ?</DialogTitle>
            <DialogDescription>
              Cette action est définitive. Tu peux aussi simplement le masquer au public.
              Ici, seule la liste de démonstration est modifiée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setItems(items.filter((item) => item.id !== deletingId));
                setDeletingId(null);
              }}
            >
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Example>
  );
}

export function PrivateProfilePreview() {
  const [active, setActive] = useState<ProfileSectionId>("freelance");
  const current = PROFILE_SECTIONS.find((section) => section.id === active)!;

  return (
    <div className="space-y-5 rounded-xl border bg-background p-5">
      <p className="font-heading text-3xl">Mon profil</p>
      <div className="grid gap-6 md:grid-cols-[15rem_1fr]">
        <nav aria-label="Exemple du menu des sections">
          {PROFILE_SECTIONS.filter(({ id }) => id !== "ordre").map(({ id, label }) => {
            const filled = ["en-tete", "a-propos", "freelance"].includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-current={active === id ? "true" : undefined}
                onClick={() => setActive(id)}
                className={`flex w-full items-center justify-between gap-3 border-l-[3px] px-3 py-2 text-left text-sm ${
                  active === id
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-transparent text-foreground hover:bg-accent"
                }`}
              >
                {label}
                {filled ? (
                  <Check aria-label="remplie" className="size-4 shrink-0 text-success" />
                ) : (
                  <Minus aria-label="vide" className="size-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            );
          })}
          <div className="mt-4 border-t pt-4">
            <button
              type="button"
              aria-current={active === "ordre" ? "true" : undefined}
              onClick={() => setActive("ordre")}
              className="flex w-full items-center gap-3 px-3 text-left text-xs font-bold tracking-[0.12em] uppercase hover:text-primary"
            >
              <ListOrdered aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
              Ordre des sections
            </button>
          </div>
        </nav>
        <div className="min-w-0 space-y-4">
          <div className="space-y-1 border-b pb-4">
            <p className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Profil</span>
              <span aria-hidden="true" className="text-muted-foreground">›</span>
              <span className="font-medium">{current.label}</span>
            </p>
            <p className="text-sm text-muted-foreground">{current.description}</p>
          </div>
          <Card>
            <CardHeader className={SECTION_HEADER}>
              <CardTitle className={SECTION_TITLE}>{current.label}</CardTitle>
            </CardHeader>
            <CardContent>Les champs de la section s’affichent dans cette carte.</CardContent>
          </Card>
          <Card>
            <CardHeader className={SECTION_HEADER}>
              <CardTitle className={SECTION_TITLE}>Expériences</CardTitle>
            </CardHeader>
            <CardContent>Les autres sections se suivent sous la carte active.</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function DesignComponents({ isDark, onModeChange }: { isDark: boolean; onModeChange: (dark: boolean) => void }) {
  const [saved, setSaved] = useState(false);
  const [freelance, setFreelance] = useState(true);
  const [online, setOnline] = useState(true);

  return (
    <section aria-labelledby="composants-utilises" className="space-y-5">
      <h3 id="composants-utilises" className="font-heading text-2xl">Composants utilisés</h3>
      <p className="text-sm text-muted-foreground">
        Exemples interactifs avec des données fictives, sans enregistrement dans un compte.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <Example title="Button" usage="Default pour enregistrer ; outline pour annuler et se connecter avec Google ; ghost et icon-sm pour les actions de liste.">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setSaved(true)}>Enregistrer</Button>
            <Button variant="outline" onClick={() => setSaved(false)}>Annuler</Button>
            <Button variant="ghost" onClick={() => setSaved(false)}>Fermer l’exemple</Button>
          </div>
          {saved && <p role="status" className="text-sm text-success">Exemple enregistré.</p>}
          <Button
            variant="outline"
            size="sm"
            className="h-auto w-full rounded-sm py-2 text-center text-xs leading-snug tracking-[0.12em] whitespace-normal uppercase shadow-sm transition-shadow hover:shadow-md"
            onClick={() => document.getElementById("apercu-public")?.scrollIntoView({ block: "start" })}
          >
            Voir mon profil public
            <ExternalLink aria-hidden="true" />
          </Button>
          <p className="text-sm text-muted-foreground">
            Raccourci du menu de « Mon profil » : capitales espacées et ombre.
            Ici, il rejoint l’aperçu public de démonstration.
          </p>
        </Example>

        <Example title="Badge" usage="Secondary dans la barre des modules et sur les éléments masqués ; success pour la disponibilité sur le profil public.">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Bientôt</Badge>
            <Badge variant="secondary">Masqué</Badge>
            <Badge variant="success">Disponible dès maintenant</Badge>
          </div>
        </Example>

        <Example title="Alert" usage="Confirmation après l’enregistrement des formulaires ; erreur de validation ou d’enregistrement dans le profil.">
          <Alert variant="success" role="status">
            <AlertDescription>Offre freelance enregistrée.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertDescription>Le titre est obligatoire.</AlertDescription>
          </Alert>
        </Example>

        <Example title="Switch et boutons radio" usage="Offre freelance : activer ses services et choisir sa disponibilité. Les radios natifs utilisent accent-primary.">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="demo-freelance">Je propose mes services en freelance</Label>
            <Switch id="demo-freelance" checked={freelance} onCheckedChange={setFreelance} />
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">Disponibilité</legend>
            {FREELANCE_AVAILABILITY.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="demo-disponibilite"
                  value={option.value}
                  defaultChecked={option.value === "disponible"}
                  className="size-4 accent-primary"
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        </Example>

        <Example title="Input, Textarea, select natif et case à cocher" usage="Champs du formulaire d’expérience, importés ici sans modification. Clique sur Modifier dans la liste pour les essayer ; la case Poste actuel utilise accent-primary.">
          <p className="text-sm text-muted-foreground">
            Input pour le poste et les dates ; Textarea pour la description ;
            select natif pour le contrat et le mode de travail, avec SELECT_CLASS.
          </p>
          <ExperienceFields item={{ ...DEMO_EXPERIENCES[0], id: "champs" }} />
        </Example>

        <Example title="DropdownMenu et sous-menus" usage="En bas de la barre des modules : initiales et nom, e-mail, sous-menu du profil public et sous-menu Thème (Clair / Sombre).">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md bg-sidebar px-3 py-2 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent">
              <span aria-hidden="true" className="flex size-6 items-center justify-center rounded bg-sidebar-accent text-xs">CM</span>
              <span className="flex-1 font-medium">Camille Martin</span>
              <ChevronsUpDown aria-hidden="true" className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="min-w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>camille@example.com</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Mon profil public</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-52">
                  <div className="flex items-center justify-between gap-3 px-1.5 py-1 text-sm">
                    <Label htmlFor="demo-online">Profil en ligne</Label>
                    <Switch id="demo-online" checked={online} onCheckedChange={setOnline} />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => document.getElementById("apercu-public")?.scrollIntoView({ block: "start" })}>
                    Ouvrir l’aperçu public
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Thème</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={isDark ? "dark" : "light"} onValueChange={(value) => onModeChange(value === "dark")}>
                    <DropdownMenuRadioItem value="light">Clair</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">Sombre</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          <p className="text-sm text-muted-foreground">Le sous-menu Thème change le mode de cette page.</p>
        </Example>
      </div>
      <ListExample />
      <p className="text-sm text-muted-foreground">
        Le menu actif, ses états ✓ / —, le fil d’Ariane « Profil › Offre freelance »
        et les cartes de section sont réunis dans le motif « Mon profil » ci-dessous.
        « Ordre des sections » reprend les boutons Monter / Descendre et ajoute une poignée de glisser-déposer.
      </p>
    </section>
  );
}
