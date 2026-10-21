import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { CertificationRow } from "../certification-fields";
import type { EducationRow } from "../education-fields";
import type { ExperienceRow } from "../experience-fields";
import type { LanguageRow } from "../language-fields";
import type { ProjectRow } from "../project-fields";
import { CvDocument } from "./cv-document";
import { CvToolbar } from "./cv-toolbar";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function CvPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string | string[] }>;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "display_name, username, headline, avatar_url, location, contact_email, website_url, linkedin_url, github_url, other_url, about, top_skills, skills, open_to_work, open_to_work_details, section_order",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Lecture du profil impossible : ${error.message}`);
  if (!profile) redirect("/onboarding");
  const queries = await Promise.all([
    supabase
      .from("profile_experiences")
      .select("*")
      .eq("profile_id", user.id)
      .eq("is_visible", true)
      .order("position")
      .order("created_at"),
    supabase
      .from("profile_educations")
      .select("*")
      .eq("profile_id", user.id)
      .eq("is_visible", true)
      .order("position")
      .order("created_at"),
    supabase
      .from("profile_languages")
      .select("*")
      .eq("profile_id", user.id)
      .eq("is_visible", true)
      .order("position")
      .order("created_at"),
    supabase
      .from("profile_certifications")
      .select("*")
      .eq("profile_id", user.id)
      .eq("is_visible", true)
      .order("position")
      .order("created_at"),
    supabase
      .from("profile_projects")
      .select("*")
      .eq("profile_id", user.id)
      .eq("is_visible", true)
      .order("position")
      .order("created_at"),
  ]);
  for (const result of queries)
    if (result.error) throw new Error(`Lecture du profil impossible : ${result.error.message}`);
  const { action } = await searchParams;
  const autoAction = action === "pdf" || action === "png" ? action : undefined;
  const [experiences, educations, languages, certifications, projects] = queries.map(
    (result) => result.data ?? [],
  );
  const today = new Date().toISOString().slice(0, 10);
  return (
    <main className="min-h-screen bg-neutral-100 pb-8 text-neutral-900">
      <div className="sr-only">
        <h1>Aperçu du CV</h1>
      </div>
      <CvToolbar autoAction={autoAction} username={profile.username} />
      <div className="cv-sheet-wrap mx-auto w-fit max-w-full overflow-x-auto px-4">
        <CvDocument
          profile={profile}
          experiences={experiences as ExperienceRow[]}
          educations={educations as EducationRow[]}
          languages={languages as LanguageRow[]}
          certifications={certifications as CertificationRow[]}
          projects={projects as ProjectRow[]}
          today={today}
        />
      </div>
    </main>
  );
}
