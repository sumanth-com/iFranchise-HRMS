"use client";

import { useEffect, useState } from "react";

import { elapsedWorkingSeconds } from "@/lib/employee/attendance-format";

/**
 * Live working seconds from check-in → last checkout (or now while still checked in).
 * Ticks every second while an open session is active.
 */
export function useLiveWorkingSeconds(
  checkInAt: string | null | undefined,
  checkOutAt: string | null | undefined,
) {
  const inAt = checkInAt ?? null;
  const outAt = checkOutAt ?? null;

  const [seconds, setSeconds] = useState(() =>
    elapsedWorkingSeconds(inAt, outAt),
  );

  useEffect(() => {
    setSeconds(elapsedWorkingSeconds(inAt, outAt));
    if (!inAt || outAt) return;

    const id = window.setInterval(() => {
      setSeconds(elapsedWorkingSeconds(inAt, null));
    }, 1000);

    return () => window.clearInterval(id);
  }, [inAt, outAt]);

  return seconds;
}
