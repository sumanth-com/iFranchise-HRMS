"use client";

import { useEffect, useState } from "react";

import { elapsedWorkingSeconds } from "@/lib/employee/attendance-format";

function computeSeconds(
  inAt: string | null,
  outAt: string | null,
  prior: number,
) {
  return elapsedWorkingSeconds(inAt, outAt, new Date(), prior);
}

/**
 * Live working seconds from check-in → last checkout (or now while still checked in),
 * including completed prior sessions from the same day.
 * Ticks every second while an open session is active (also on tab focus).
 */
export function useLiveWorkingSeconds(
  checkInAt: string | null | undefined,
  checkOutAt: string | null | undefined,
  priorCompletedSeconds = 0,
) {
  const inAt = checkInAt ?? null;
  const outAt = checkOutAt ?? null;
  const prior = Math.max(0, Math.floor(priorCompletedSeconds));

  const [seconds, setSeconds] = useState(() =>
    computeSeconds(inAt, outAt, prior),
  );

  useEffect(() => {
    const tick = () => setSeconds(computeSeconds(inAt, outAt, prior));
    tick();
    if (!inAt || outAt) return;

    const id = window.setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, [inAt, outAt, prior]);

  return seconds;
}
