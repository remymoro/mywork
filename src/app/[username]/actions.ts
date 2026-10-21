"use server";

import { createClient } from "@/lib/supabase/server";

/** L'e-mail de contact n'est pas écrit dans la page publique : le visiteur le demande d'un clic. */
export async function revealContactEmail(username: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("contact_email")
    .eq("username", username)
    .maybeSingle();
  return data?.contact_email ?? null;
}
