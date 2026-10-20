"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidUsername, normalizeUsername } from "@/lib/username";

export type OnboardingState = { error?: string };

export async function createProfile(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const displayName = String(formData.get("display_name") ?? "").trim() || null;

  if (!isValidUsername(username)) {
    return { error: "3 à 30 caractères : minuscules, chiffres et tirets (pas au début ni à la fin)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .insert({ id: user.id, username, display_name: displayName });

  if (error) {
    return {
      error: error.code === "23505" ? "Ce pseudo n'est pas disponible." : "Impossible de créer le profil.",
    };
  }

  redirect("/dashboard");
}
