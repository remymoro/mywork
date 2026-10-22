import { Fragment } from "react";
import Image from "next/image";
import { Briefcase, CodeXml, EyeOff, Globe, Link2, MapPin } from "lucide-react";
import { Logo } from "@/components/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { CertificationRow } from "@/app/dashboard/profil/certification-fields";
import type { EducationRow } from "@/app/dashboard/profil/education-fields";
import type { ExperienceRow } from "@/app/dashboard/profil/experience-fields";
import type { LanguageRow } from "@/app/dashboard/profil/language-fields";
import type { ProjectRow } from "@/app/dashboard/profil/project-fields";
import type { ServiceRow } from "@/app/dashboard/profil/service-fields";
import {
  EMPLOYMENT_TYPES,
  LANGUAGE_LEVELS,
  WORK_MODES,
  formatDay,
  formatDuration,
  formatEuros,
  formatMonth,
  getInitials,
  labelOf,
  normalizeSectionOrder,
  type FreelanceAvailability,
  type PublicSectionId,
} from "@/lib/profile-sections";
import { ResourcesSection, type PublicResource } from "@/components/drive/resources-section";
import { ContactButton } from "./contact-button";

export type PublicProfileData = {
  username: string;
  is_online: boolean;
  display_name: string | null;
  headline: string | null;
  avatar_url: string | null;
  location: string | null;
  open_to_work: boolean;
  open_to_work_details: string | null;
  hasContact: boolean;
  website_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  other_url: string | null;
  about: string | null;
  top_skills: string[];
  skills: string[];
  /** Ordre choisi dans « Mon profil » (vide = ordre par défaut). */
  section_order?: string[];
  /** Offre freelance ; null si la case « Je propose mes services en freelance » est décochée. */
  freelance?: FreelanceOffer | null;
};

export type FreelanceOffer = {
  availability: FreelanceAvailability;
  available_from: string | null;
  work_modes: string[];
  daily_rate: number | null;
  travel_zone: string | null;
};

export function FreelanceSection({
  offer,
  services,
  nowIso,
}: {
  offer: FreelanceOffer | null | undefined;
  services: ServiceRow[];
  nowIso?: string;
}) {
  if (!offer) return null;
  const today = nowIso ?? new Date().toISOString().slice(0, 10);
  // Une date « à partir du » déjà passée revient à « disponible ».
  const availability =
    offer.availability === "disponible" ||
    (offer.availability === "a_partir_du" && offer.available_from && offer.available_from <= today)
      ? { text: "Disponible dès maintenant", variant: "success" as const }
      : offer.availability === "a_partir_du" && offer.available_from
        ? { text: `Disponible à partir du ${formatDay(offer.available_from)}`, variant: "success" as const }
        : offer.availability === "indisponible"
          ? { text: "Indisponible pour le moment", variant: "secondary" as const }
          : null;
  const modes = offer.work_modes.map((m) => labelOf(WORK_MODES, m)).filter(Boolean).join(" · ");

  const details = [
    modes ? { label: "Mode de travail", value: modes } : null,
    offer.daily_rate ? { label: "TJM", value: `${formatEuros(offer.daily_rate)} HT / jour` } : null,
    offer.travel_zone ? { label: "Zone de déplacement", value: offer.travel_zone } : null,
  ].filter((d): d is NonNullable<typeof d> => d !== null);

  return (
    // Carte affichée dans la colonne de droite de la page publique.
    <section aria-labelledby="freelance-title" className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="space-y-2">
        <h2 id="freelance-title" className="font-heading text-2xl font-normal tracking-tight">
          Freelance
        </h2>
        <p className="text-sm text-muted-foreground">Je propose mes services en freelance</p>
        {availability && <Badge variant={availability.variant}>{availability.text}</Badge>}
      </div>
      {details.length > 0 && (
          <dl className="space-y-3 border-t pt-4 text-sm">
            {details.map((d) => (
              <div key={d.label} className="space-y-0.5">
                <dt className="text-xs text-muted-foreground">{d.label}</dt>
                <dd className="font-medium">{d.value}</dd>
              </div>
            ))}
          </dl>
      )}
      {services.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold">Prestations</h3>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service.id} className="space-y-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{service.title}</span>
                    {service.starting_price && (
                      <span className="text-sm text-muted-foreground">
                        à partir de {formatEuros(service.starting_price)} HT
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
      )}
    </section>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </h2>
  );
}

export function AboutSection({
  about,
  topSkills,
}: {
  about: string | null;
  topSkills: string[];
}) {
  if (!about && topSkills.length === 0) return null;
  return (
    <section className="space-y-3">
      <SectionHeading>À PROPOS</SectionHeading>
      {about && <p className="whitespace-pre-line text-sm leading-relaxed">{about}</p>}
      {topSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {topSkills.map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}

function currentMonthIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function ExperienceSection({ items, nowIso }: { items: ExperienceRow[]; nowIso?: string }) {
  if (items.length === 0) return null;
  const currentIso = nowIso ?? currentMonthIso();

  return (
    <section className="space-y-4">
      <SectionHeading>EXPÉRIENCE</SectionHeading>
      <div className="space-y-5">
        {items.map((exp) => {
          const contractLabel = labelOf(EMPLOYMENT_TYPES, exp.employment_type);
          const companyLine = [exp.company, contractLabel].filter(Boolean).join(" · ");
          const modeLabel = labelOf(WORK_MODES, exp.work_mode);
          const locationLine = [exp.location, modeLabel].filter(Boolean).join(" · ");

          const endForDuration = exp.is_current ? currentIso : exp.end_date;
          const duration = endForDuration ? formatDuration(exp.start_date, endForDuration) : "";
          const endLabel = exp.is_current
            ? "aujourd'hui"
            : exp.end_date
              ? formatMonth(exp.end_date)
              : "";
          const period = endLabel
            ? `${formatMonth(exp.start_date)} – ${endLabel}`
            : formatMonth(exp.start_date);
          const dateLine = duration ? `${period} · ${duration}` : period;

          return (
            <article key={exp.id} className="space-y-1.5">
              <h3 className="font-semibold text-foreground">{exp.title}</h3>
              <p className="text-sm text-foreground/90">{companyLine}</p>
              {locationLine && <p className="text-xs text-muted-foreground">{locationLine}</p>}
              <p className="text-xs text-muted-foreground">{dateLine}</p>
              {exp.description && (
                <p className="pt-1 whitespace-pre-line text-sm leading-relaxed">
                  {exp.description}
                </p>
              )}
              {exp.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {exp.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function EducationSection({ items }: { items: EducationRow[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-4">
      <SectionHeading>FORMATION</SectionHeading>
      <div className="space-y-5">
        {items.map((edu) => {
          const degreeLine = [edu.degree, edu.field].filter(Boolean).join(" · ");
          const years = [edu.start_year, edu.end_year].filter(Boolean).join(" – ");
          return (
            <article key={edu.id} className="space-y-1">
              <h3 className="font-semibold text-foreground">{edu.school}</h3>
              {degreeLine && <p className="text-sm text-foreground/90">{degreeLine}</p>}
              {years && <p className="text-xs text-muted-foreground">{years}</p>}
              {edu.grade && <p className="text-xs text-muted-foreground">Mention : {edu.grade}</p>}
              {edu.description && (
                <p className="pt-1 whitespace-pre-line text-sm leading-relaxed">
                  {edu.description}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function SkillsSection({ skills }: { skills: string[] }) {
  if (skills.length === 0) return null;
  return (
    <section className="space-y-3">
      <SectionHeading>COMPÉTENCES</SectionHeading>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <Badge key={skill} variant="secondary">
            {skill}
          </Badge>
        ))}
      </div>
    </section>
  );
}

export function LanguageSection({ items }: { items: LanguageRow[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <SectionHeading>LANGUES</SectionHeading>
      <ul className="space-y-1.5 text-sm">
        {items.map((lang) => (
          <li key={lang.id}>
            <span className="font-medium">{lang.name}</span> —{" "}
            <span className="text-muted-foreground">
              {labelOf(LANGUAGE_LEVELS, lang.level) ?? lang.level}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CertificationSection({ items }: { items: CertificationRow[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-4">
      <SectionHeading>CERTIFICATIONS</SectionHeading>
      <div className="space-y-4">
        {items.map((cert) => {
          const dates = [
            cert.issued_on ? `Obtenue en ${formatMonth(cert.issued_on)}` : null,
            cert.expires_on ? `Expire en ${formatMonth(cert.expires_on)}` : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <article key={cert.id} className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="font-semibold text-foreground">{cert.name}</h3>
                {cert.credential_url && (
                  <a
                    href={cert.credential_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Vérifier ↗
                  </a>
                )}
              </div>
              {cert.issuer && <p className="text-sm text-foreground/90">{cert.issuer}</p>}
              {dates && <p className="text-xs text-muted-foreground">{dates}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ProjectSection({ items }: { items: ProjectRow[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-4">
      <SectionHeading>PROJETS</SectionHeading>
      <div className="space-y-5">
        {items.map((proj) => {
          const period = proj.start_date
            ? proj.end_date
              ? `${formatMonth(proj.start_date)} – ${formatMonth(proj.end_date)}`
              : formatMonth(proj.start_date)
            : null;

          return (
            <article key={proj.id} className="space-y-1.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="font-semibold text-foreground">{proj.name}</h3>
                {proj.url && (
                  <a
                    href={proj.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Voir ↗
                  </a>
                )}
              </div>
              {period && <p className="text-xs text-muted-foreground">{period}</p>}
              {proj.image_url && (
                <Image
                  src={proj.image_url}
                  alt={`Aperçu du projet ${proj.name}`}
                  width={640}
                  height={360}
                  sizes="(min-width: 768px) 640px, 100vw"
                  className="my-2 aspect-video w-full max-w-xl rounded-lg border object-cover"
                />
              )}
              {proj.description && (
                <p className="whitespace-pre-line text-sm leading-relaxed">{proj.description}</p>
              )}
              {proj.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {proj.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function PublicProfileView({
  profile,
  experiences,
  educations,
  languages,
  certifications,
  projects,
  services = [],
  resources = [],
}: {
  profile: PublicProfileData;
  experiences: ExperienceRow[];
  educations: EducationRow[];
  languages: LanguageRow[];
  certifications: CertificationRow[];
  projects: ProjectRow[];
  services?: ServiceRow[];
  /** Fichiers publics du Drive (section « Ressources », en dernier). */
  resources?: PublicResource[];
}) {
  const displayName = profile.display_name ?? profile.username;
  const initials = getInitials(profile.display_name ?? "", profile.username);
  // Comme LinkedIn : le premier poste actuel (dans l'ordre choisi) s'affiche au-dessus du nom.
  const currentPosition = experiences.find((exp) => exp.is_current);

  const hasFreelance = Boolean(profile.freelance);
  const sections: Record<PublicSectionId, React.ReactNode> = {
    about: <AboutSection about={profile.about} topSkills={profile.top_skills} />,
    experiences: <ExperienceSection items={experiences} />,
    educations: <EducationSection items={educations} />,
    skills: <SkillsSection skills={profile.skills} />,
    languages: <LanguageSection items={languages} />,
    certifications: <CertificationSection items={certifications} />,
    projects: <ProjectSection items={projects} />,
  };

  const links = [
    profile.website_url ? { label: "Site", href: profile.website_url, Icon: Globe } : null,
    profile.linkedin_url ? { label: "LinkedIn", href: profile.linkedin_url, Icon: Briefcase } : null,
    profile.github_url ? { label: "GitHub", href: profile.github_url, Icon: CodeXml } : null,
    profile.other_url ? { label: "Autre", href: profile.other_url, Icon: Link2 } : null,
  ].filter((link): link is NonNullable<typeof link> => link !== null);

  return (
    <div className="min-h-screen bg-background">
      <main className={`mx-auto space-y-8 px-4 py-6 sm:px-6 sm:py-10 ${hasFreelance ? "max-w-5xl" : "max-w-3xl"}`}>
        <header className="flex items-center justify-between">
          <Logo />
        </header>

        {/* Un profil hors ligne n'est lisible que par son propriétaire (RLS) : on le lui signale. */}
        {!profile.is_online && (
          <Alert role="status">
            <EyeOff aria-hidden="true" />
            <AlertDescription>
              Ton profil est hors ligne : toi seul le vois. Les visiteurs voient « Page
              introuvable ». Réactive « Profil en ligne » dans le menu de ton espace.
            </AlertDescription>
          </Alert>
        )}

        <section className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              width={96}
              height={96}
              className="size-24 shrink-0 rounded-full border object-cover"
            />
          ) : (
            <div
              aria-label="Initiales"
              className="flex size-24 shrink-0 items-center justify-center rounded-full border bg-muted font-heading text-2xl text-muted-foreground"
            >
              {initials}
            </div>
          )}

          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              {currentPosition && (
                <p className="text-lg font-medium text-foreground">
                  {currentPosition.title} · {currentPosition.company}
                </p>
              )}
              <h1 className="font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
                {displayName}
              </h1>
              {profile.headline && (
                <p className="text-lg text-muted-foreground">{profile.headline}</p>
              )}
              {profile.location && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-4" />
                  {profile.location}
                </p>
              )}
            </div>

            {profile.open_to_work && (
              <div>
                <Badge variant="success">
                  Ouvert aux opportunités
                  {profile.open_to_work_details ? ` : ${profile.open_to_work_details}` : ""}
                </Badge>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {profile.hasContact && <ContactButton username={profile.username} />}

              {links.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <Separator />

        {/* Offre freelance : carte à droite, les autres sections à gauche. */}
        <div className={hasFreelance ? "grid gap-10 md:grid-cols-[1fr_18rem]" : undefined}>
          <div className="min-w-0 space-y-8">
            {normalizeSectionOrder(profile.section_order).map((id) => (
              <Fragment key={id}>{sections[id]}</Fragment>
            ))}
            <ResourcesSection username={profile.username} items={resources} />
          </div>
          {hasFreelance && (
            <aside className="md:sticky md:top-6 md:self-start">
              <FreelanceSection offer={profile.freelance} services={services} />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
