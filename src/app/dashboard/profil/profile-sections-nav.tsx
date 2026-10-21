"use client";

import { useState, type ReactNode } from "react";
import {
  Award,
  Briefcase,
  Camera,
  FolderKanban,
  GraduationCap,
  IdCard,
  Languages,
  type LucideIcon,
  MapPin,
  Sparkles,
  UserRound,
} from "lucide-react";

export const PROFILE_SECTIONS = [
  { id: "identite", label: "Éditer mon profil", Icon: UserRound },
  { id: "photo", label: "Photo", Icon: Camera },
  { id: "en-tete", label: "En-tête", Icon: MapPin },
  { id: "a-propos", label: "À propos", Icon: IdCard },
  { id: "experience", label: "Expérience", Icon: Briefcase },
  { id: "formation", label: "Formation", Icon: GraduationCap },
  { id: "competences", label: "Compétences", Icon: Sparkles },
  { id: "langues", label: "Langues", Icon: Languages },
  { id: "certifications", label: "Certifications", Icon: Award },
  { id: "projets", label: "Projets", Icon: FolderKanban },
] as const satisfies readonly { id: string; label: string; Icon: LucideIcon }[];

export type ProfileSectionId = (typeof PROFILE_SECTIONS)[number]["id"];

// Menu des sections à gauche ; seuls les champs de la section choisie s'affichent à droite.
export function ProfileSectionsNav({ sections }: { sections: Record<ProfileSectionId, ReactNode> }) {
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
      </nav>

      <section aria-label={current.label} className="min-w-0">
        {sections[active]}
      </section>
    </div>
  );
}
