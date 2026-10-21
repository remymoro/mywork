"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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

const anchor = (id: ProfileSectionId) => `section-${id}`;

// Menu des sections à gauche ; toutes les sections s'enchaînent à droite. Un clic fait défiler
// jusqu'à la section, et la section visible est mise en avant dans le menu pendant le défilement.
export function ProfileSectionsNav({
  sections,
  username,
}: {
  sections: Record<ProfileSectionId, ReactNode>;
  username: string;
}) {
  const [active, setActive] = useState<ProfileSectionId>("identite");
  // Pendant un défilement lancé par un clic, on ignore le suivi pour ne pas faire clignoter le menu.
  const scrollingTo = useRef<ProfileSectionId | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        const id = visible.target.id.replace("section-", "") as ProfileSectionId;
        if (scrollingTo.current && scrollingTo.current !== id) return;
        scrollingTo.current = null;
        setActive(id);
      },
      // Une section est « active » quand elle occupe le haut de l'écran.
      { rootMargin: "-10% 0px -70% 0px" },
    );
    for (const { id } of PROFILE_SECTIONS) {
      const el = document.getElementById(anchor(id));
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function goTo(id: ProfileSectionId) {
    setActive(id);
    scrollingTo.current = id;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(anchor(id))
      ?.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
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
                  aria-controls={anchor(id)}
                  onClick={() => goTo(id)}
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
          // cn() fusionne avec les classes du bouton (sinon text-xs / rounded-sm ne l'emportent pas toujours).
          // Retour à la ligne autorisé : le texte en capitales espacées dépassait la colonne du menu.
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-4 h-auto w-full rounded-sm py-2 text-center text-xs leading-snug tracking-[0.12em] whitespace-normal uppercase shadow-sm transition-shadow hover:shadow-md",
          )}
        >
          Voir mon profil public
          <ExternalLink aria-hidden="true" />
        </a>
      </nav>

      <div className="min-w-0 space-y-10">
        {PROFILE_SECTIONS.map(({ id, label }) => (
          <section key={id} id={anchor(id)} aria-label={label} className="scroll-mt-6">
            {sections[id]}
          </section>
        ))}
        {/* Espace en bas : la dernière section peut remonter en haut de l'écran. */}
        <div aria-hidden="true" className="h-[50vh]" />
      </div>
    </div>
  );
}
