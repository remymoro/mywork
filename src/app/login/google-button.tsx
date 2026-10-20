"use client";

import { Button } from "@/components/ui/button";
import { GoogleLogo } from "@/components/google-logo";
import { createClient } from "@/lib/supabase/client";

export function GoogleButton() {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <Button variant="outline" size="lg" onClick={signIn} className="w-full gap-2">
      <GoogleLogo />
      Continuer avec Google
    </Button>
  );
}
