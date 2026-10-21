"use client";

import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revealContactEmail } from "./actions";

export function ContactButton({ username, demoEmail }: { username: string; demoEmail?: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleReveal() {
    setLoading(true);
    try {
      // Page de démonstration : pas de profil en base, l'adresse fictive est fournie directement.
      const revealed = demoEmail ?? (await revealContactEmail(username));
      if (revealed) setEmail(revealed);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!email) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={handleReveal} disabled={loading}>
        <Mail aria-hidden="true" className="size-4" />
        Afficher l&apos;e-mail
      </Button>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2 text-sm">
      <a
        href={`mailto:${email}`}
        className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
      >
        {email}
      </a>
      <Button type="button" variant="outline" size="xs" onClick={handleCopy}>
        {copied ? (
          <Check aria-hidden="true" className="size-3.5" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
        {copied ? "Copié" : "Copier"}
      </Button>
    </div>
  );
}
