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
import { cn } from "@/lib/utils";

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
  // En gras : réglage de toute la page, pas une section à remplir.
  { id: "ordre", label: "Ordre des sections", Icon: ListOrdered, bold: true },
] as const satisfies readonly { id: string; label: string; Icon: LucideIcon; bold?: boolean }[];

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
          {PROFILE_SECTIONS.map((section) => {
            const { id, label, Icon } = section;
            const isActive = id === active;
            const bold = "bold" in section && section.bold;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => setActive(id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-l-[3px] px-3 py-2 text-left text-sm whitespace-nowrap",
                    isActive
                      ? "border-primary bg-accent font-medium text-accent-foreground"
                      : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
                    bold && "font-bold text-foreground",
                  )}
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
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className:
              "mt-4 rounded-sm text-xs font-medium tracking-[0.12em] uppercase shadow-sm transition-shadow hover:shadow-md",
          })}
        >
          Voir mon profil public
          <ExternalLink aria-hidden="true" />
        </a>
      </nav>

      <section aria-label={current.label} className="min-w-0">
        {sections[active]}
      </section>
    </div>
  );
}
