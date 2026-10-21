"use client";

import { useState, type ReactNode } from "react";
import {
  Award,
  BadgeEuro,
  Briefcase,
  Camera,
  ExternalLink,
  FolderKanban,
  GraduationCap,
  IdCard,
  Languages,
  ListOrdered,
  type LucideIcon,
  MapPin,
  Sparkles,
  UserRound,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const PROFILE_SECTIONS = [
  { id: "identite", label: "Éditer mon profil", Icon: UserRound },
  { id: "photo", label: "Photo", Icon: Camera },
  { id: "en-tete", label: "En-tête", Icon: MapPin },
  { id: "freelance", label: "Freelance", Icon: BadgeEuro },
  { id: "a-propos", label: "À propos", Icon: IdCard },
  { id: "experience", label: "Expérience", Icon: Briefcase },
  { id: "formation", label: "Formation", Icon: GraduationCap },
  { id: "competences", label: "Compétences", Icon: Sparkles },
  { id: "langues", label: "Langues", Icon: Languages },
  { id: "certifications", label: "Certifications", Icon: Award },
  { id: "projets", label: "Projets", Icon: FolderKanban },
  { id: "ordre", label: "Ordre des sections", Icon: ListOrdered },
] as const satisfies readonly { id: string; label: string; Icon: LucideIcon }[];

export type ProfileSectionId = (typeof PROFILE_SECTIONS)[number]["id"];

// Menu des sections à gauche ; seuls les champs de la section choisie s'affichent à droite.
export function ProfileSectionsNav({
  sections,
  username,
}: {
  sections: Record<ProfileSectionId, ReactNode>;
  username: string;
}) {
  const [active, setActive] = useState<ProfileSectionId>("identite");
  const current = PROFILE_SECTIONS.find((s) => s.id === active)!;

  return (
    <div className="grid gap-6 md:grid-cols-[13rem_1fr]">
      <nav aria-label="Sections du profil" className="md:sticky md:top-6 md:self-start">
        <ul className="flex gap-1 overflow-x-auto md:flex-col">
          {PROFILE_SECTIONS.map(({ id, label, Icon }) => {
            const isActive = id === active;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => setActive(id)}
                  className={
                    isActive
                      ? "flex w-full items-center gap-3 border-l-[3px] border-primary bg-accent px-3 py-2 text-left text-sm font-medium whitespace-nowrap text-accent-foreground"
                      : "flex w-full items-center gap-3 border-l-[3px] border-transparent px-3 py-2 text-left text-sm whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-foreground"
                  }
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
        {/* Raccourci vers la page publique, sous la liste des sections. */}
        <a
          href={`/${username}`}
          target="_blank"
          rel="noreferrer noopener"
          className={buttonVariants({ variant: "outline", className: "mt-4 w-full" })}
        >
          <ExternalLink aria-hidden="true" />
          Voir mon profil public
        </a>
      </nav>

      <section aria-label={current.label} className="min-w-0">
        {sections[active]}
      </section>
    </div>
  );
}
