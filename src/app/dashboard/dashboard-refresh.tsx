"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Relecture serveur sans perdre la position dans la page. */
export function DashboardRefresh({ refreshAt }: { refreshAt: string }) {
  const router = useRouter();
  useEffect(() => {
    let timer: number;
    const refresh = () => {
      router.refresh();
      timer = window.setTimeout(refresh, 60_000);
    };
    const onVisible = () => { if (document.visibilityState === "visible") router.refresh(); };
    const delay = Date.parse(refreshAt) - Date.now();
    timer = window.setTimeout(refresh, Number.isFinite(delay) ? Math.min(60_000, Math.max(0, delay)) : 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshAt, router]);
  return null;
}
