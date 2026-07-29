"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `callback` on an interval only while the document tab is visible.
 * Skips the first run when `skipInitial` is true (SSR/hydration already supplied data).
 */
export function usePollWhenVisible(
  callback: () => void,
  intervalMs: number,
  options?: { enabled?: boolean; skipInitial?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const skipInitial = options?.skipInitial ?? false;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const run = () => {
      if (document.visibilityState !== "visible") return;
      callbackRef.current();
    };

    if (!skipInitial) {
      run();
    }

    intervalId = setInterval(run, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        run();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs, skipInitial]);
}
