import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, permanentRedirect } from "next/navigation";
import type { CertificationRow } from "@/app/dashboard/profil/certification-fields";
import type { EducationRow } from "@/app/dashboard/profil/education-fields";
import type { ExperienceRow } from "@/app/dashboard/profil/experience-fields";
import type { LanguageRow } from "@/app/dashboard/profil/language-fields";
import type { ProjectRow } from "@/app/dashboard/profil/project-fields";
import type { ServiceRow } from "@/app/dashboard/profil/service-fields";
import { parseResourceFilter, type PublicResource } from "@/components/drive/resources-section";
import { createClient } from "@/lib/supabase/server";
import { PublicProfileView } from "./profile-view";

// Page dépendante de la session ou de l'URL : elle bloque côté serveur (voir docs/decisions.md).
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, headline")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return { title: "Profil introuvable — MyWork" };
  const name = profile.display_name || profile.username;
  return {
    title: profile.headline ? `${name} — ${profile.headline}` : name,
  };
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ onglet?: string | string[]; type?: string | string[] }>;
}) {
  await connection();
  const { username } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, is_online, display_name, headline, avatar_url, location, open_to_work, open_to_work_details, contact_email, website_url, linkedin_url, github_url, other_url, about, top_skills, skills, section_order, freelance_enabled, freelance_availability, freelance_available_from, freelance_work_modes, freelance_daily_rate, freelance_travel_zone",
    )
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    // Ancien pseudo ? on redirige vers le pseudo actuel.
    const { data: old } = await supabase
      .from("username_history")
      .select("profile_id")
      .eq("old_username", username)
      .maybeSingle();
    if (old) {
      const { data: current } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", old.profile_id)
        .maybeSingle();
      if (current) permanentRedirect(`/${current.username}`);
    }
    notFound();
  }

  const [experiencesRes, educationsRes, languagesRes, certificationsRes, projectsRes, servicesRes, resourcesRes] =
    await Promise.all([
      supabase
        .from("profile_experiences")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("is_visible", true)
        .order("position")
        .order("created_at"),
      supabase
        .from("profile_educations")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("is_visible", true)
        .order("position")
        .order("created_at"),
      supabase
        .from("profile_languages")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("is_visible", true)
        .order("position")
        .order("created_at"),
      supabase
        .from("profile_certifications")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("is_visible", true)
        .order("position")
        .order("created_at"),
      supabase
        .from("profile_projects")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("is_visible", true)
        .order("position")
        .order("created_at"),
      supabase
        .from("profile_services")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("is_visible", true)
        .order("position")
        .order("created_at"),
      supabase
        .from("drive_files")
        .select("id, name, size_bytes, mime_type, updated_at")
        .eq("owner_id", profile.id)
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);

  return (
    <PublicProfileView
      profile={{
        username: profile.username,
        is_online: profile.is_online,
        display_name: profile.display_name,
        headline: profile.headline,
        avatar_url: profile.avatar_url,
        location: profile.location,
        open_to_work: profile.open_to_work ?? false,
        open_to_work_details: profile.open_to_work_details,
        hasContact: Boolean(profile.contact_email),
        website_url: profile.website_url,
        linkedin_url: profile.linkedin_url,
        github_url: profile.github_url,
        other_url: profile.other_url,
        about: profile.about,
        top_skills: profile.top_skills ?? [],
        skills: profile.skills ?? [],
        section_order: profile.section_order ?? [],
        freelance: profile.freelance_enabled
          ? {
              availability: profile.freelance_availability,
              available_from: profile.freelance_available_from,
              work_modes: profile.freelance_work_modes ?? [],
              daily_rate: profile.freelance_daily_rate,
              travel_zone: profile.freelance_travel_zone,
            }
          : null,
      }}
      experiences={(experiencesRes.data ?? []) as ExperienceRow[]}
      educations={(educationsRes.data ?? []) as EducationRow[]}
      languages={(languagesRes.data ?? []) as LanguageRow[]}
      certifications={(certificationsRes.data ?? []) as CertificationRow[]}
      projects={(projectsRes.data ?? []) as ProjectRow[]}
      services={(servicesRes.data ?? []) as ServiceRow[]}
      activeTab={query.onglet === "drive" ? "drive" : "profil"}
      resourceFilter={parseResourceFilter(typeof query.type === "string" ? query.type : undefined)}
      resources={(resourcesRes.data ?? []).map((r) => ({ ...r, size_bytes: Number(r.size_bytes) })) as PublicResource[]}
    />
  );
}
