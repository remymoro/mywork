"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { avatarError, parseProfileForm } from "@/lib/profile";

export type ProfileState = { error?: string; saved?: boolean };

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = parseProfileForm(formData);
  if (parsed.error) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const update: Record<string, string | null> = { ...parsed.values };

  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    const problem = avatarError(file);
    if (problem) return { error: problem };
    // Un seul fichier par utilisateur ; l'extension peut changer, on nettoie l'ancien.
    const path = `${user.id}/avatar.${EXTENSIONS[file.type]}`;
    await supabase.storage.from("avatars").remove(
      Object.values(EXTENSIONS).map((ext) => `${user.id}/avatar.${ext}`).filter((p) => p !== path),
    );
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) return { error: "Impossible d'envoyer la photo." };
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    update.avatar_url = `${data.publicUrl}?v=${Date.now()}`;
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) {
    return {
      error: error.code === "23505" ? "Ce pseudo n'est pas disponible." : "Impossible d'enregistrer le profil.",
    };
  }

  return { saved: true };
}
