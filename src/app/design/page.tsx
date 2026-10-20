import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heading, Text } from "@/components/ui/typography";

export const metadata: Metadata = {
  title: "Design — MyWork",
  robots: { index: false },
};

const colors = [
  ["background", "bg-background"],
  ["foreground", "bg-foreground"],
  ["primary", "bg-primary"],
  ["secondary", "bg-secondary"],
  ["muted", "bg-muted"],
  ["accent", "bg-accent"],
  ["border", "bg-border"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["destructive", "bg-destructive"],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <Heading level={2}>{title}</Heading>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-12 p-6 py-12">
      <header className="space-y-3">
        <Logo />
        <Heading level={1}>Design system</Heading>
        <Text variant="lead">
          Style sobre et professionnel (D20). Chaque couleur est un jeton défini dans <code>globals.css</code> : on ne
          met jamais de couleur en dur dans une page.
        </Text>
      </header>

      <Section title="Couleurs">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {colors.map(([name, cls]) => (
            <li key={name} className="space-y-1.5">
              <div className={`h-12 rounded-lg ring-1 ring-foreground/10 ${cls}`} />
              <Text variant="muted">{name}</Text>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typographie">
        <div className="space-y-2">
          <Heading level={1}>Titre de page</Heading>
          <Heading level={2}>Titre de section</Heading>
          <Heading level={3}>Sous-titre</Heading>
          <Text>Texte courant, pour les paragraphes.</Text>
          <Text variant="muted">Texte discret, pour les aides et les détails.</Text>
          <Text variant="lead">Texte d&apos;introduction, sous un titre.</Text>
        </div>
      </Section>

      <Section title="Boutons">
        <div className="flex flex-wrap gap-3">
          <Button>Principal</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="outline">Contour</Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="destructive">Supprimer</Button>
          <Button variant="link">Lien</Button>
          <Button disabled>Désactivé</Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-3">
          <Badge>Par défaut</Badge>
          <Badge variant="secondary">Secondaire</Badge>
          <Badge variant="outline">Contour</Badge>
          <Badge variant="success">Confirmé</Badge>
          <Badge variant="warning">En attente</Badge>
          <Badge variant="destructive">Annulé</Badge>
        </div>
      </Section>

      <Section title="Messages">
        <div className="space-y-3">
          <Alert>Information neutre.</Alert>
          <Alert variant="success">Enregistré.</Alert>
          <Alert variant="warning">Attention, vérifie ce point.</Alert>
          <Alert variant="destructive">Une erreur est survenue.</Alert>
        </div>
      </Section>

      <Section title="Formulaire et carte">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Créer mon profil</CardTitle>
            <CardDescription>Choisis ton pseudo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="demo-pseudo">Pseudo</Label>
              <Input id="demo-pseudo" placeholder="mon-pseudo" />
            </div>
            <Button className="w-full">Valider</Button>
          </CardContent>
        </Card>
      </Section>
    </main>
  );
}
