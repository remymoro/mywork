"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SECTIONS,
  isSectionName,
  validateAbout,
  validateHeader,
  validateSkills,
  type Fields,
  type Result,
  type SectionName,
} from "@/lib/profile-sections";

export type FormState = { error?: string; saved?: boolean };

const AVATAR_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

function toFields(formData: FormData): Fields {
  const fields: Fields = {};
  for (const [key, value] of formData) if (typeof value === "string") fields[key] = value;
  return fields;
}

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

function refresh() {
  revalidatePath("/dashboard/profil");
}

// En-tête, à propos et compétences sont des colonnes de la table profiles.
async function updateProfileColumns<T extends object>(
  validate: (fields: Fields) => Result<T>,
  formData: FormData,
): Promise<FormState> {
  const parsed = validate(toFields(formData));
  if (!parsed.ok) return { error: parsed.error };
  const { supabase, userId } = await currentUser();
  const { error } = await supabase.from("profiles").update(parsed.value).eq("id", userId);
  if (error) return { error: "Impossible d'enregistrer." };
  refresh();
  return { saved: true };
}

export async function updateHeader(_prev: FormState, formData: FormData): Promise<FormState> {
  return updateProfileColumns(validateHeader, formData);
}

export async function updateAbout(_prev: FormState, formData: FormData): Promise<FormState> {
  return updateProfileColumns(validateAbout, formData);
}

export async function updateSkills(_prev: FormState, formData: FormData): Promise<FormState> {
  return updateProfileColumns(validateSkills, formData);
}

/** Ajoute (sans champ « id ») ou modifie (avec « id ») un élément d'une section. */
export async function saveSectionItem(
  section: SectionName,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSectionName(section)) return { error: "Section inconnue." };
  const { table, validate } = SECTIONS[section];
  const parsed = validate(toFields(formData));
  if (!parsed.ok) return { error: parsed.error };

  const { supabase, userId } = await currentUser();
  const id = formData.get("id");
  let error;
  if (typeof id === "string" && id) {
    ({ error } = await supabase.from(table).update(parsed.value).eq("id", id).eq("profile_id", userId));
  } else {
    // Nouvel élément : placé en fin de liste.
    const { data: last } = await supabase
      .from(table)
      .select("position")
      .eq("profile_id", userId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    ({ error } = await supabase
      .from(table)
      .insert({ ...parsed.value, profile_id: userId, position: (last?.position ?? -1) + 1 }));
  }
  if (error) return { error: "Impossible d'enregistrer." };
  refresh();
  return { saved: true };
}

export async function deleteSectionItem(section: SectionName, id: string): Promise<FormState> {
  if (!isSectionName(section)) return { error: "Section inconnue." };
  const { supabase, userId } = await currentUser();
  const { error } = await supabase.from(SECTIONS[section].table).delete().eq("id", id).eq("profile_id", userId);
  if (error) return { error: "Impossible de supprimer." };
  refresh();
  return {};
}

export async function setSectionItemVisible(
  section: SectionName,
  id: string,
  visible: boolean,
): Promise<FormState> {
  if (!isSectionName(section)) return { error: "Section inconnue." };
  const { supabase, userId } = await currentUser();
  const { error } = await supabase
    .from(SECTIONS[section].table)
    .update({ is_visible: visible })
    .eq("id", id)
    .eq("profile_id", userId);
  if (error) return { error: "Impossible de modifier la visibilité." };
  refresh();
  return {};
}

/** Échange la place d'un élément avec son voisin du dessus (-1) ou du dessous (+1). */
export async function moveSectionItem(
  section: SectionName,
  id: string,
  direction: -1 | 1,
): Promise<FormState> {
  if (!isSectionName(section)) return { error: "Section inconnue." };
  const { table } = SECTIONS[section];
  const { supabase, userId } = await currentUser();
  const { data: items } = await supabase
    .from(table)
    .select("id, position")
    .eq("profile_id", userId)
    .order("position")
    .order("created_at");
  if (!items) return { error: "Impossible de déplacer." };

  const index = items.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return {};
  [items[index], items[target]] = [items[target], items[index]];

  // Renumérote toute la liste : corrige aussi d'éventuelles positions en double.
  for (const [position, item] of items.entries()) {
    const { error } = await supabase.from(table).update({ position }).eq("id", item.id).eq("profile_id", userId);
    if (error) return { error: "Impossible de déplacer." };
  }
  refresh();
  return {};
}

export async function uploadAvatar(_prev: FormState, formData: FormData): Promise<FormState> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis une image." };
  const extension = AVATAR_TYPES[file.type];
  if (!extension) return { error: "Formats acceptés : JPEG, PNG ou WebP." };
  if (file.size > AVATAR_MAX_BYTES) return { error: "L'image dépasse 2 Mo." };

  const { supabase, userId } = await currentUser();
  // Nom unique à chaque envoi : évite qu'une ancienne photo reste en cache.
  const path = `${userId}/${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    contentType: file.type,
  });
  if (uploadError) return { error: "Impossible d'envoyer la photo." };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", userId);
  if (error) return { error: "Impossible d'enregistrer la photo." };

  await removeOldAvatars(supabase, userId, path);
  refresh();
  return { saved: true };
}

export async function removeAvatar(): Promise<FormState> {
  const { supabase, userId } = await currentUser();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) return { error: "Impossible de retirer la photo." };
  await removeOldAvatars(supabase, userId);
  refresh();
  return {};
}

// Supprime les photos de l'utilisateur, sauf celle à garder.
async function removeOldAvatars(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  keep?: string,
) {
  const { data: files } = await supabase.storage.from("avatars").list(userId);
  const old = (files ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
  if (old.length) await supabase.storage.from("avatars").remove(old);
}
