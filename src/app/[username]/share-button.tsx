"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copie l'adresse de la page (ou ouvre le partage du téléphone quand il existe). */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Partage annulé ou presse-papiers refusé : rien à faire.
    }
  }

  return (
    <Button type="button" variant="ghost" size="icon" onClick={share} aria-label={copied ? "Lien copié" : "Partager ce profil"} title="Partager">
      {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
    </Button>
  );
}
