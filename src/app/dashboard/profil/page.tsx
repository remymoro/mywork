import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "../profile-editor";
import { DashboardShell } from "../shell";
import { AboutForm } from "./about-form";
import { AvatarForm } from "./avatar-form";
import type { CertificationRow } from "./certification-fields";
import type { EducationRow } from "./education-fields";
import type { ExperienceRow } from "./experience-fields";
import { HeaderForm } from "./header-form";
import type { LanguageRow } from "./language-fields";
import type { ProjectRow } from "./project-fields";
import { ProfileSectionsNav } from "./profile-sections-nav";
import { SectionList } from "./section-list";
import { SkillsForm } from "./skills-form";

// Page dépendante de la session : elle bloque côté serveur (voir docs/decisions.md).
export const instant = false;

export default async function ProfilePage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "username, display_name, headline, is_online, avatar_url, location, open_to_work, open_to_work_details, contact_email, website_url, linkedin_url, github_url, other_url, about, top_skills, skills",
    )
    .eq("id", user.id)
    .maybeSingle();
  // Une erreur de lecture ne doit pas renvoyer vers /onboarding (boucle avec /dashboard).
  if (error) throw new Error(`Lecture du profil impossible : ${error.message}`);
  if (!profile) redirect("/onboarding");

  const [experiencesRes, educationsRes, languagesRes, certificationsRes, projectsRes] =
    await Promise.all([
      supabase
        .from("profile_experiences")
        .select("*")
        .eq("profile_id", user.id)
        .order("position")
        .order("created_at"),
      supabase
        .from("profile_educations")
        .select("*")
        .eq("profile_id", user.id)
        .order("position")
        .order("created_at"),
      supabase
        .from("profile_languages")
        .select("*")
        .eq("profile_id", user.id)
        .order("position")
        .order("created_at"),
      supabase
        .from("profile_certifications")
        .select("*")
        .eq("profile_id", user.id)
        .order("position")
        .order("created_at"),
      supabase
        .from("profile_projects")
        .select("*")
        .eq("profile_id", user.id)
        .order("position")
        .order("created_at"),
    ]);

  const experiences = (experiencesRes.data ?? []) as ExperienceRow[];
  const educations = (educationsRes.data ?? []) as EducationRow[];
  const languages = (languagesRes.data ?? []) as LanguageRow[];
  const certifications = (certificationsRes.data ?? []) as CertificationRow[];
  const projects = (projectsRes.data ?? []) as ProjectRow[];

  return (
    <DashboardShell
      active="profil"
      email={user.email ?? ""}
      username={profile.username}
      isOnline={profile.is_online}
    >
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          ESPACE PRIVÉ
        </p>
        <h1 className="font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          Mon profil
        </h1>
        <p className="text-sm text-muted-foreground">
          Choisis ce que les visiteurs voient sur ta page.
        </p>
      </div>
      <ProfileSectionsNav
        sections={{
          identite: (
            <ProfileEditor
              key={`${profile.username}|${profile.display_name}|${profile.headline}`}
              username={profile.username}
              displayName={profile.display_name ?? ""}
              headline={profile.headline ?? ""}
            />
          ),
          photo: (
            <AvatarForm
              avatarUrl={profile.avatar_url ?? null}
              displayName={profile.display_name ?? ""}
              username={profile.username}
            />
          ),
          "en-tete": (
            <HeaderForm
              key={`${profile.location}|${profile.open_to_work}|${profile.open_to_work_details}|${profile.contact_email}|${profile.website_url}|${profile.linkedin_url}|${profile.github_url}|${profile.other_url}`}
              location={profile.location ?? ""}
              openToWork={profile.open_to_work ?? false}
              openToWorkDetails={profile.open_to_work_details ?? ""}
              contactEmail={profile.contact_email ?? ""}
              websiteUrl={profile.website_url ?? ""}
              linkedinUrl={profile.linkedin_url ?? ""}
              githubUrl={profile.github_url ?? ""}
              otherUrl={profile.other_url ?? ""}
            />
          ),
          "a-propos": (
            <AboutForm
              key={`${profile.about}|${(profile.top_skills ?? []).join(",")}`}
              about={profile.about ?? ""}
              topSkills={profile.top_skills ?? []}
            />
          ),
          experience: <SectionList section="experiences" title="Expérience" items={experiences} />,
          formation: <SectionList section="educations" title="Formation" items={educations} />,
          competences: (
            <SkillsForm key={(profile.skills ?? []).join(",")} skills={profile.skills ?? []} />
          ),
          langues: <SectionList section="languages" title="Langues" items={languages} />,
          certifications: (
            <SectionList section="certifications" title="Certifications" items={certifications} />
          ),
          projets: <SectionList section="projects" title="Projets" items={projects} />,
        }}
      />
    </DashboardShell>
  );
}
