"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revealContactEmail } from "./actions";

export function ContactButton({ username }: { username: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleReveal() {
    setLoading(true);
    try {
      const revealed = await revealContactEmail(username);
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
      <Button
        type="button"
        size="lg"
        className="gap-2 px-4 text-xs font-medium uppercase tracking-[0.12em]"
        onClick={handleReveal}
        disabled={loading}
      >
        Me contacter
        <ArrowRight aria-hidden="true" className="size-4" />
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
