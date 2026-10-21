"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SECTIONS,
  isSectionName,
  normalizeSectionOrder,
  validateAbout,
  validateHeader,
  validateSkills,
  type Fields,
  type Result,
  type SectionName,
} from "@/lib/profile-sections";

export type FormState = { error?: string; saved?: boolean };

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Fichier image envoyé par le formulaire : absent (null), valide, ou message d'erreur. */
function readImage(formData: FormData, name: string): File | null | { error: string } {
  const file = formData.get(name);
  if (!(file instanceof File) || file.size === 0) return null;
  if (!IMAGE_TYPES[file.type]) return { error: "Formats acceptés : JPEG, PNG ou WebP." };
  if (file.size > IMAGE_MAX_BYTES) return { error: "L'image dépasse 2 Mo." };
  return file;
}

/** Envoie l'image dans « bucket/folder/ » et renvoie son adresse publique. */
async function storeImage(supabase: Supabase, bucket: string, folder: string, file: File) {
  // Nom unique à chaque envoi : évite qu'une ancienne image reste en cache.
  const path = `${folder}/${Date.now()}.${IMAGE_TYPES[file.type]}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) return null;
  return { path, url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

// Supprime les fichiers d'un dossier, sauf celui à garder.
async function removeFiles(supabase: Supabase, bucket: string, folder: string, keep?: string) {
  const { data: files } = await supabase.storage.from(bucket).list(folder);
  const old = (files ?? []).map((f) => `${folder}/${f.name}`).filter((p) => p !== keep);
  if (old.length) await supabase.storage.from(bucket).remove(old);
}

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

/** Ordre des sections de la page publique (glisser-déposer), enregistré dès qu'on lâche. */
export async function updateSectionOrder(order: string[]): Promise<FormState> {
  const normalized = normalizeSectionOrder(Array.isArray(order) ? order : []);
  const { supabase, userId } = await currentUser();
  const { error } = await supabase.from("profiles").update({ section_order: normalized }).eq("id", userId);
  if (error) return { error: "Impossible d'enregistrer l'ordre." };
  refresh();
  revalidatePath("/[username]", "page");
  return { saved: true };
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
  // Seuls les projets ont une image.
  const image = section === "projects" ? readImage(formData, "image") : null;
  if (image && "error" in image) return { error: image.error };

  const { supabase, userId } = await currentUser();
  const id = formData.get("id");
  let savedId: string | undefined;
  let error;
  if (typeof id === "string" && id) {
    ({ error } = await supabase.from(table).update(parsed.value).eq("id", id).eq("profile_id", userId));
    savedId = id;
  } else {
    // Nouvel élément : placé en fin de liste.
    const { data: last } = await supabase
      .from(table)
      .select("position")
      .eq("profile_id", userId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    let inserted;
    ({ data: inserted, error } = await supabase
      .from(table)
      .insert({ ...parsed.value, profile_id: userId, position: (last?.position ?? -1) + 1 })
      .select("id")
      .single());
    savedId = inserted?.id;
  }
  if (error || !savedId) return { error: "Impossible d'enregistrer." };

  if (section === "projects") {
    const imageError = await updateProjectImage(supabase, userId, savedId, image, formData.get("remove_image") === "on");
    if (imageError) return { error: imageError };
  }
  refresh();
  return { saved: true };
}

// Nouvelle image (remplace l'ancienne) ou case « Retirer l'image » cochée.
async function updateProjectImage(
  supabase: Supabase,
  userId: string,
  projectId: string,
  image: File | null,
  remove: boolean,
): Promise<string | null> {
  const folder = `${userId}/${projectId}`;
  if (image) {
    const stored = await storeImage(supabase, "project-images", folder, image);
    if (!stored) return "Projet enregistré, mais impossible d'envoyer l'image.";
    const { error } = await supabase
      .from("profile_projects")
      .update({ image_url: stored.url })
      .eq("id", projectId)
      .eq("profile_id", userId);
    if (error) return "Projet enregistré, mais impossible d'enregistrer l'image.";
    await removeFiles(supabase, "project-images", folder, stored.path);
  } else if (remove) {
    const { error } = await supabase
      .from("profile_projects")
      .update({ image_url: null })
      .eq("id", projectId)
      .eq("profile_id", userId);
    if (error) return "Impossible de retirer l'image.";
    await removeFiles(supabase, "project-images", folder);
  }
  return null;
}

export async function deleteSectionItem(section: SectionName, id: string): Promise<FormState> {
  if (!isSectionName(section)) return { error: "Section inconnue." };
  const { supabase, userId } = await currentUser();
  const { error } = await supabase.from(SECTIONS[section].table).delete().eq("id", id).eq("profile_id", userId);
  if (error) return { error: "Impossible de supprimer." };
  if (section === "projects") await removeFiles(supabase, "project-images", `${userId}/${id}`);
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
  const image = readImage(formData, "avatar");
  if (!image) return { error: "Choisis une image." };
  if ("error" in image) return { error: image.error };

  const { supabase, userId } = await currentUser();
  const stored = await storeImage(supabase, "avatars", userId, image);
  if (!stored) return { error: "Impossible d'envoyer la photo." };

  const { error } = await supabase.from("profiles").update({ avatar_url: stored.url }).eq("id", userId);
  if (error) return { error: "Impossible d'enregistrer la photo." };

  await removeFiles(supabase, "avatars", userId, stored.path);
  refresh();
  return { saved: true };
}

export async function removeAvatar(): Promise<FormState> {
  const { supabase, userId } = await currentUser();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) return { error: "Impossible de retirer la photo." };
  await removeFiles(supabase, "avatars", userId);
  refresh();
  return {};
}
