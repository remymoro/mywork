import {
  AboutSection,
  FreelanceSection,
  SkillsSection,
  type PublicProfileData,
} from "@/app/[username]/profile-view";
import { CvDocument } from "@/app/dashboard/profil/cv/cv-document";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import { PrivateProfilePreview } from "./design-components";

// Données fictives communes aux aperçus public et A4. Aucun accès à un compte.
const DEMO_PROFILE: PublicProfileData = {
  username: "camille-exemple",
  is_online: true,
  display_name: "Camille Martin",
  headline: "Conseil produit & design numérique",
  avatar_url: null,
  location: "Lyon, France",
  open_to_work: true,
  open_to_work_details: "missions freelance",
  hasContact: false,
  website_url: null,
  linkedin_url: null,
  github_url: null,
  other_url: null,
  about: "J’accompagne les équipes de l’idée au lancement de leurs produits numériques.",
  top_skills: ["Stratégie produit", "Design"],
  skills: ["Recherche utilisateur", "Gestion de projet", "Prototypage"],
  freelance: {
    availability: "disponible",
    available_from: null,
    work_modes: ["teletravail", "hybride"],
    daily_rate: 550,
    travel_zone: "Lyon et environs",
  },
};

export function DesignPatterns() {
  return (
    <section aria-labelledby="motifs-pages" className="space-y-8">
      <h3 id="motifs-pages" className="font-heading text-2xl">Motifs de page</h3>
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Mon profil · espace privé</h4>
        <p className="text-sm text-muted-foreground">
          Menu des sections à gauche, fil d’Ariane puis cartes à droite. L’entrée
          active porte une barre carmin et un fond bg-primary/10 ; ✓ vert indique
          une section remplie et — gris une section vide. Clique dans ce menu réduit
          pour changer de section. Dans l’application, ce clic fait défiler les cartes.
        </p>
        <PrivateProfilePreview />
        <p className="text-sm text-muted-foreground">
          La barre des modules entoure cette page : Mon tableau de bord, Mon profil,
          puis Rendez-vous, Boards, Fichiers et Visio en « Bientôt ». Le tableau de
          bord central affiche pour l’instant « Futures informations sur mon espace ».
          L’en-tête du profil conserve un petit aperçu du nom et du titre à côté du formulaire.
        </p>
      </div>

      <div id="apercu-public" className="scroll-mt-6 space-y-4">
        <h4 className="text-sm font-semibold">Profil public</h4>
        <p className="text-sm text-muted-foreground">
          Aperçu réduit avec les vraies sections publiques et un profil fictif : en-tête,
          sections remplies à gauche, carte Freelance à droite, fixe pendant le défilement.
          Les sections vides et éléments masqués sont absents.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-background p-6">
          <div className="w-[64rem] space-y-8 [zoom:0.75]">
            <header>
              <Logo />
            </header>
            <div className="flex items-start gap-6">
              <div className="flex size-24 shrink-0 items-center justify-center rounded-full border bg-muted font-heading text-2xl text-muted-foreground">
                CM
              </div>
              <div className="space-y-2">
                <p className="font-heading text-3xl font-normal tracking-tight sm:text-4xl">
                  {DEMO_PROFILE.display_name}
                </p>
                <p className="text-lg text-muted-foreground">{DEMO_PROFILE.headline}</p>
                <p className="text-sm text-muted-foreground">{DEMO_PROFILE.location}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-[1fr_18rem] gap-10">
              <div className="space-y-8">
                <AboutSection about={DEMO_PROFILE.about} topSkills={DEMO_PROFILE.top_skills} />
                <SkillsSection skills={DEMO_PROFILE.skills} />
              </div>
              <aside className="self-start">
                <FreelanceSection offer={DEMO_PROFILE.freelance} services={[]} nowIso="2026-10-21" />
              </aside>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold">CV · feuille A4</h4>
        <p className="text-sm text-muted-foreground">
          Le vrai document A4 (210 × 297 mm), réduit ici à 40 % : papier blanc et
          texte sombre dans les deux modes, sections visibles dans l’ordre choisi,
          sans offre freelance. Cette même feuille sert à l’impression PDF et à l’export PNG.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-muted p-5">
          <div className="w-fit [zoom:0.4]">
            <CvDocument
              profile={{ ...DEMO_PROFILE, contact_email: null, section_order: [] }}
              experiences={[]}
              educations={[]}
              languages={[]}
              certifications={[]}
              projects={[]}
              today="2026-10-21"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
