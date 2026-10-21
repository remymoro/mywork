"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateProfileInput } from "@/lib/profile";

export type ProfileState = { error?: string; saved?: boolean };

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = validateProfileInput({
    username: String(formData.get("username") ?? ""),
    displayName: String(formData.get("display_name") ?? ""),
    headline: String(formData.get("headline") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.value.username,
      display_name: parsed.value.displayName,
      headline: parsed.value.headline,
    })
    .eq("id", user.id);

  if (error) {
    return {
      error: error.code === "23505" ? "Ce pseudo n'est pas disponible." : "Impossible d'enregistrer le profil.",
    };
  }
  return { saved: true };
}

export async function setProfileOnline(online: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ is_online: online })
    .eq("id", user.id);

  if (error) {
    return { error: "Impossible de modifier la visibilité du profil." };
  }

  revalidatePath("/dashboard", "layout");
  return {};
}
