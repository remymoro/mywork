import type { CertificationRow } from "../certification-fields";
import type { EducationRow } from "../education-fields";
import type { ExperienceRow } from "../experience-fields";
import type { LanguageRow } from "../language-fields";
import type { ProjectRow } from "../project-fields";
import {
  EMPLOYMENT_TYPES,
  LANGUAGE_LEVELS,
  WORK_MODES,
  formatDuration,
  formatMonth,
  getInitials,
  labelOf,
  normalizeSectionOrder,
} from "@/lib/profile-sections";

type CvProfile = {
  display_name: string | null;
  username: string;
  headline: string | null;
  avatar_url: string | null;
  location: string | null;
  contact_email: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  other_url: string | null;
  about: string | null;
  top_skills: string[] | null;
  skills: string[] | null;
  open_to_work: boolean | null;
  open_to_work_details: string | null;
  section_order: string[] | null;
};

export type CvDocumentProps = {
  profile: CvProfile;
  experiences: ExperienceRow[];
  educations: EducationRow[];
  languages: LanguageRow[];
  certifications: CertificationRow[];
  projects: ProjectRow[];
  today: string;
};

function readableLink(value: string) {
  try {
    const url = new URL(value);
    // Chemin décodé : « linkedin.com/in/rémy-moro » plutôt que « r%C3%A9my-moro ».
    return `${url.hostname.replace(/^www\./, "")}${decodeURIComponent(url.pathname).replace(/\/$/, "")}`;
  } catch {
    return value;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 border-b border-neutral-300 pb-1 font-heading text-lg font-semibold text-neutral-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CvDocument({
  profile,
  experiences,
  educations,
  languages,
  certifications,
  projects,
  today,
}: CvDocumentProps) {
  const name = profile.display_name || profile.username;
  const currentRole = experiences.find((item) => item.is_current)?.title;
  const links = [
    profile.website_url,
    profile.linkedin_url,
    profile.github_url,
    profile.other_url,
  ].filter(Boolean) as string[];
  const sections = {
    about:
      profile.about || profile.top_skills?.length ? (
        <Section title="À propos">
          {profile.about && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-800">
              {profile.about}
            </p>
          )}
          {!!profile.top_skills?.length && (
            <p className="mt-2 text-sm text-neutral-800">
              <strong>Compétences clés :</strong> {profile.top_skills.join(" · ")}
            </p>
          )}
        </Section>
      ) : null,
    experiences: experiences.length ? (
      <Section title="Expérience">
        <div className="space-y-4">
          {experiences.map((item) => {
            const end = item.is_current ? today : item.end_date;
            const period = `${formatMonth(item.start_date)} – ${item.is_current ? "Aujourd’hui" : item.end_date ? formatMonth(item.end_date) : ""}`;
            const duration = end ? formatDuration(item.start_date, end) : "";
            const contract = labelOf(EMPLOYMENT_TYPES, item.employment_type);
            return (
              <article key={item.id} className="break-inside-avoid text-sm text-neutral-800">
                <h3 className="font-semibold text-neutral-900">{item.title}</h3>
                <p>
                  {item.company}
                  {contract ? ` · ${contract}` : ""}
                </p>
                {(item.location || item.work_mode) && (
                  <p>
                    {[item.location, labelOf(WORK_MODES, item.work_mode)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <p className="text-neutral-600">
                  {period}
                  {duration ? ` · ${duration}` : ""}
                </p>
                {item.description && <p className="mt-1 whitespace-pre-line">{item.description}</p>}
                {!!item.skills?.length && (
                  <p className="mt-1 text-neutral-600">{item.skills.join(" · ")}</p>
                )}
              </article>
            );
          })}
        </div>
      </Section>
    ) : null,
    educations: educations.length ? (
      <Section title="Formation">
        <div className="space-y-3">
          {educations.map((item) => (
            <article key={item.id} className="break-inside-avoid text-sm text-neutral-800">
              <h3 className="font-semibold text-neutral-900">{item.school}</h3>
              <p>{[item.degree, item.field].filter(Boolean).join(" · ")}</p>
              <p className="text-neutral-600">
                {[item.start_year, item.end_year].filter(Boolean).join(" – ")}
                {item.grade ? ` · ${item.grade}` : ""}
              </p>
              {item.description && <p className="mt-1 whitespace-pre-line">{item.description}</p>}
            </article>
          ))}
        </div>
      </Section>
    ) : null,
    skills: profile.skills?.length ? (
      <Section title="Compétences">
        <p className="text-sm text-neutral-800">{profile.skills.join(" · ")}</p>
      </Section>
    ) : null,
    languages: languages.length ? (
      <Section title="Langues">
        <p className="text-sm text-neutral-800">
          {languages
            .map((item) => `${item.name} — ${labelOf(LANGUAGE_LEVELS, item.level) ?? item.level}`)
            .join(" · ")}
        </p>
      </Section>
    ) : null,
    certifications: certifications.length ? (
      <Section title="Certifications">
        <div className="space-y-2">
          {certifications.map((item) => (
            <article key={item.id} className="text-sm text-neutral-800">
              <h3 className="font-semibold text-neutral-900">{item.name}</h3>
              <p>
                {[item.issuer, item.issued_on ? formatMonth(item.issued_on) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {item.credential_url && <p>{readableLink(item.credential_url)}</p>}
            </article>
          ))}
        </div>
      </Section>
    ) : null,
    projects: projects.length ? (
      <Section title="Projets">
        <div className="space-y-3">
          {projects.map((item) => (
            <article key={item.id} className="break-inside-avoid text-sm text-neutral-800">
              <h3 className="font-semibold text-neutral-900">{item.name}</h3>
              {(item.start_date || item.end_date) && (
                <p className="text-neutral-600">
                  {[
                    item.start_date ? formatMonth(item.start_date) : null,
                    item.end_date ? formatMonth(item.end_date) : null,
                  ]
                    .filter(Boolean)
                    .join(" – ")}
                </p>
              )}
              {item.description && <p className="mt-1 whitespace-pre-line">{item.description}</p>}
              {item.url && <p>{readableLink(item.url)}</p>}
              {!!item.skills?.length && (
                <p className="mt-1 text-neutral-600">{item.skills.join(" · ")}</p>
              )}
            </article>
          ))}
        </div>
      </Section>
    ) : null,
  };
  return (
    <article
      id="cv-document"
      className="box-border min-h-[297mm] w-[210mm] bg-white p-[16mm] text-neutral-900 shadow-xl print:min-h-0 print:w-full print:p-[16mm] print:shadow-none"
    >
      <header className="flex items-center gap-5 border-b border-neutral-300 pb-5">
        {profile.avatar_url ? (
          // html-to-image a besoin d'une image HTML directement accessible.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            crossOrigin="anonymous"
            alt=""
            className="size-24 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-24 items-center justify-center rounded-full bg-neutral-200 font-heading text-2xl text-neutral-700"
          >
            {getInitials(name, profile.username)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-heading text-3xl font-semibold">{name}</p>
          {currentRole && <p className="mt-1 text-lg">{currentRole}</p>}
          {profile.headline && <p className="text-neutral-700">{profile.headline}</p>}
          {profile.open_to_work && (
            <p className="mt-1 text-sm text-neutral-700">
              Ouvert aux opportunités
              {profile.open_to_work_details ? ` : ${profile.open_to_work_details}` : ""}
            </p>
          )}
        </div>
      </header>
      {(profile.location || profile.contact_email || links.length > 0) && (
        <p className="mt-4 text-xs leading-relaxed text-neutral-700">
          {[profile.location, profile.contact_email, ...links.map(readableLink)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {normalizeSectionOrder(profile.section_order).map((id) => (
        <div key={id}>{sections[id]}</div>
      ))}
    </article>
  );
}
