"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronRight, Download, ExternalLink, Eye, ListOrdered, Minus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Sections de « Mon profil », dans l'ordre de la maquette du porteur (2026-10-21).
export const PROFILE_SECTIONS = [
  {
    id: "en-tete",
    label: "En-tête",
    description: "Ton nom, ton titre et ta photo : la première chose que voient les visiteurs.",
  },
  {
    id: "coordonnees",
    label: "Coordonnées",
    description: "Localisation, e-mail de contact et liens vers tes autres profils.",
  },
  {
    id: "a-propos",
    label: "À propos",
    description: "Présente ton parcours en quelques paragraphes et mets en avant tes compétences clés.",
  },
  {
    id: "freelance",
    label: "Offre freelance",
    description:
      "Ajoute des informations sur ton offre de services en freelance. Ces informations seront visibles sur ton profil public.",
  },
  { id: "experiences", label: "Expériences", description: "Tes postes, du plus récent au plus ancien." },
  { id: "projets", label: "Projets", description: "Les projets que tu veux montrer, avec une image." },
  { id: "formation", label: "Formation", description: "Tes diplômes et formations." },
  { id: "certifications", label: "Certifications", description: "Tes certifications et leur lien de vérification." },
  { id: "competences", label: "Compétences", description: "La liste complète de tes compétences." },
  { id: "langues", label: "Langues", description: "Les langues que tu parles et ton niveau." },
  {
    id: "ordre",
    label: "Ordre des sections",
    description: "Choisis l'ordre des sections sur ta page publique.",
  },
] as const;

export type ProfileSectionId = (typeof PROFILE_SECTIONS)[number]["id"];

const anchor = (id: ProfileSectionId) => `section-${id}`;
const MAIN_SECTIONS = PROFILE_SECTIONS.filter((s) => s.id !== "ordre");
const CV_ACTIONS = [
  { label: "Aperçu du CV", href: "/dashboard/profil/cv", Icon: Eye },
  { label: "Télécharger en PDF", href: "/dashboard/profil/cv?action=pdf", Icon: Download },
  { label: "Télécharger en PNG", href: "/dashboard/profil/cv?action=png", Icon: Download },
];

// Menu des sections à gauche ; toutes les sections s'enchaînent à droite. Un clic fait défiler
// jusqu'à la section, et la section visible est mise en avant dans le menu pendant le défilement.
export function ProfileSectionsNav({
  sections,
  filled,
  username,
}: {
  sections: Record<ProfileSectionId, ReactNode>;
  /** Section remplie (✓) ou vide (—). */
  filled: Partial<Record<ProfileSectionId, boolean>>;
  username: string;
}) {
  const [active, setActive] = useState<ProfileSectionId>("en-tete");
  // Pendant un défilement lancé par un clic, on ignore le suivi pour ne pas faire clignoter le menu.
  const scrollingTo = useRef<ProfileSectionId | null>(null);
  const current = PROFILE_SECTIONS.find((s) => s.id === active)!;

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
    <div className="grid min-w-0 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <nav aria-label="Sections du profil" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {MAIN_SECTIONS.map(({ id, label }) => {
            const isActive = id === active;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-current={isActive ? "true" : undefined}
                  aria-controls={anchor(id)}
                  aria-label={`${label} (${filled[id] ? "remplie" : "vide"})`}
                  onClick={() => goTo(id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 border-b-[3px] px-3 py-2 text-left text-sm whitespace-nowrap lg:border-b-0 lg:border-l-[3px]",
                    isActive
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-transparent text-foreground hover:bg-accent",
                  )}
                >
                  {label}
                  {filled[id] ? (
                    <Check aria-hidden="true" className="size-4 shrink-0 text-success" />
                  ) : (
                    <Minus aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-3 lg:mt-4 lg:block lg:space-y-4 lg:border-t lg:pt-4">
          <button
            type="button"
            aria-current={active === "ordre" ? "true" : undefined}
            aria-controls={anchor("ordre")}
            onClick={() => goTo("ordre")}
            className={cn(
              "flex items-center gap-3 px-3 text-left text-xs font-bold tracking-[0.12em] uppercase lg:w-full",
              active === "ordre" ? "text-primary" : "text-foreground hover:text-primary",
            )}
          >
            <ListOrdered aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
            Ordre des sections
          </button>
          {/* Raccourci vers la page publique. */}
          <a
            href={`/${username}`}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-auto rounded-sm py-2 text-center text-xs leading-snug tracking-[0.12em] whitespace-normal uppercase shadow-sm transition-shadow hover:shadow-md lg:w-full",
            )}
          >
            Voir mon profil public
            <ExternalLink aria-hidden="true" />
          </a>
        </div>

        {/* Aperçu et export du CV. */}
        <div className="mt-4 space-y-2 border-t pt-4 lg:mt-4">
          <p className="px-3 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">CV</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 lg:block lg:space-y-1">
            {CV_ACTIONS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-3 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-primary"
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="min-w-0 space-y-6">
        <div className="space-y-1 border-b pb-4">
          <p className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Profil</span>
            <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
            <span className="font-medium" data-testid="breadcrumb-current">
              {current.label}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">{current.description}</p>
        </div>

        {PROFILE_SECTIONS.map(({ id, label }) => (
          <section key={id} id={anchor(id)} aria-label={label} className="scroll-mt-6 space-y-6">
            {sections[id]}
          </section>
        ))}
        {/* Espace en bas : la dernière section peut remonter en haut de l'écran. */}
        <div aria-hidden="true" className="h-[50vh]" />
      </div>
    </div>
  );
}
