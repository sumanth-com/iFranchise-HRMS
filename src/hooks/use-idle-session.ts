"use client";

import { useEffect, useRef } from "react";

import { idleSessionLogoutAction, touchSessionActivityAction } from "@/lib/auth/actions";
import {
  IDLE_ACTIVITY_STORAGE_KEY,
  IDLE_LOGOUT_BROADCAST_KEY,
} from "@/lib/auth/constants";
import { isIdleSessionExpired } from "@/lib/auth/idle-session";

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "click",
  "scroll",
  "touchstart",
] as const;

const ACTIVITY_DEBOUNCE_MS = 30_000;
const IDLE_CHECK_INTERVAL_MS = 60_000;

function readStoredActivity(): number {
  try {
    const raw = window.localStorage.getItem(IDLE_ACTIVITY_STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  } catch {
    return Date.now();
  }
}

function writeStoredActivity(timestamp: number) {
  try {
    window.localStorage.setItem(IDLE_ACTIVITY_STORAGE_KEY, String(timestamp));
  } catch {
    // Ignore storage failures
  }
}

export function useIdleSession() {
  const lastTouchAtRef = useRef(0);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    const recordActivity = (touchServer: boolean) => {
      const now = Date.now();
      writeStoredActivity(now);

      if (!touchServer || now - lastTouchAtRef.current < ACTIVITY_DEBOUNCE_MS) {
        return;
      }

      lastTouchAtRef.current = now;
      void touchSessionActivityAction().catch(() => {
        // Server touch is best-effort; middleware still enforces on navigation.
      });
    };

    const performIdleLogout = async (broadcast: boolean) => {
      if (isLoggingOutRef.current || disposed) return;
      isLoggingOutRef.current = true;

      if (broadcast) {
        try {
          window.localStorage.setItem(
            IDLE_LOGOUT_BROADCAST_KEY,
            Date.now().toString(),
          );
        } catch {
          // Ignore storage failures
        }
      }

      try {
        await idleSessionLogoutAction();
      } catch (error) {
        const digest =
          typeof error === "object" && error !== null && "digest" in error
            ? String((error as { digest?: string }).digest ?? "")
            : "";
        if (digest.startsWith("NEXT_REDIRECT")) {
          return;
        }
        window.location.assign("/login?expired=1");
      }
    };

    const evaluateIdleTimeout = () => {
      if (isLoggingOutRef.current || disposed) return;
      const lastActivity = readStoredActivity();
      if (isIdleSessionExpired(lastActivity)) {
        void performIdleLogout(true);
      }
    };

    const handleActivity = () => recordActivity(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        recordActivity(true);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === IDLE_ACTIVITY_STORAGE_KEY && event.newValue) {
        // User is active in another tab; keep last activity updated in this tab
        const parsed = Number(event.newValue);
        if (Number.isFinite(parsed) && parsed > 0) {
          lastTouchAtRef.current = parsed;
        }
        return;
      }

      if (event.key === IDLE_LOGOUT_BROADCAST_KEY && event.newValue) {
        void performIdleLogout(false);
      }
    };

    recordActivity(true);

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorage);

    const intervalId = window.setInterval(
      evaluateIdleTimeout,
      IDLE_CHECK_INTERVAL_MS,
    );

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);
}
