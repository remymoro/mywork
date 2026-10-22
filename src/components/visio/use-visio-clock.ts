"use client";

import { useEffect, useState } from "react";

/** Horloge initialisée par le serveur, réévaluée aussi au retour sur l'onglet. */
export function useVisioClock(nowIso: string) {
  const [tick, setTick] = useState({ source: nowIso, elapsed: 0 });
  useEffect(() => {
    const mountedAt = Date.now();
    const update = () => setTick({ source: nowIso, elapsed: Date.now() - mountedAt });
    const timer = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, [nowIso]);
  return Date.parse(nowIso) + (tick.source === nowIso ? tick.elapsed : 0);
}
