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
import {
  EMPLOYMENT_TYPES,
  LANGUAGE_LEVELS,
  WORK_MODES,
  formatDuration,
  formatMonth,
  getInitials,
  labelOf,
} from "@/lib/profile-sections";
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
};

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
}: {
  profile: PublicProfileData;
  experiences: ExperienceRow[];
  educations: EducationRow[];
  languages: LanguageRow[];
  certifications: CertificationRow[];
  projects: ProjectRow[];
}) {
  const displayName = profile.display_name ?? profile.username;
  const initials = getInitials(profile.display_name ?? "", profile.username);
  // Comme LinkedIn : le premier poste actuel (dans l'ordre choisi) s'affiche au-dessus du nom.
  const currentPosition = experiences.find((exp) => exp.is_current);

  const links = [
    profile.website_url ? { label: "Site", href: profile.website_url, Icon: Globe } : null,
    profile.linkedin_url ? { label: "LinkedIn", href: profile.linkedin_url, Icon: Briefcase } : null,
    profile.github_url ? { label: "GitHub", href: profile.github_url, Icon: CodeXml } : null,
    profile.other_url ? { label: "Autre", href: profile.other_url, Icon: Link2 } : null,
  ].filter((link): link is NonNullable<typeof link> => link !== null);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
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

        <div className="space-y-8">
          <AboutSection about={profile.about} topSkills={profile.top_skills} />
          <ExperienceSection items={experiences} />
          <EducationSection items={educations} />
          <SkillsSection skills={profile.skills} />
          <LanguageSection items={languages} />
          <CertificationSection items={certifications} />
          <ProjectSection items={projects} />
        </div>
      </main>
    </div>
  );
}
