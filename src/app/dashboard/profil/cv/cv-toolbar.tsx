"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CvToolbar({
  autoAction,
  username,
}: {
  autoAction?: "pdf" | "png";
  username: string;
}) {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);
  const print = useCallback(() => window.print(), []);
  const downloadPng = useCallback(async () => {
    setPreparing(true);
    setError("");
    try {
      const element = document.getElementById("cv-document");
      if (!element) throw new Error("Document CV introuvable.");
      const dataUrl = await toPng(element, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = `cv-${username}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("Le téléchargement de l’image a échoué. Réessaie dans un instant.");
    } finally {
      setPreparing(false);
    }
  }, [username]);
  useEffect(() => {
    if (!autoAction || started.current) return;
    started.current = true;
    void (async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images).map((image) => image.decode().catch(() => undefined)),
      );
      if (autoAction === "pdf") print();
      else await downloadPng();
    })();
  }, [autoAction, downloadPng, print]);
  return (
    <div className="print:hidden">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-5">
        <Link
          href="/dashboard/profil"
          className="text-sm text-neutral-700 underline underline-offset-4"
        >
          ← Retour à Mon profil
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={print}
            className={cn(buttonVariants({ variant: "outline" }), "rounded-sm")}
          >
            Télécharger en PDF
          </button>
          <button
            type="button"
            onClick={() => void downloadPng()}
            disabled={preparing}
            className={cn(buttonVariants(), "rounded-sm")}
          >
            {preparing ? "Préparation…" : "Télécharger en PNG"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mx-auto max-w-[210mm] px-4 pb-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
