"use client";

import Image from "next/image";
import { useLayoutEffect, useState } from "react";

import brandLogo from "@/assets/Logo.png";
import { cn } from "@/lib/utils";

/** Session-scoped: splash once per browser tab/session, including return from login. */
export const LANDING_SPLASH_SESSION_KEY = "ifranchise.landing.splash.v2";

const FULL_EXIT_MS = 2850;
const FULL_GONE_MS = 3450;
const REDUCED_EXIT_MS = 260;
const REDUCED_GONE_MS = 480;

type SplashPhase = "boot" | "play" | "exit" | "gone";

type SplashWindow = Window & {
  __ifranchiseSplashLock?: "play" | "done";
  __ifranchiseSplashFinalizeTimer?: number;
};

function hasSplashBeenShown(): boolean {
  try {
    return sessionStorage.getItem(LANDING_SPLASH_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markSplashShown(): void {
  try {
    sessionStorage.setItem(LANDING_SPLASH_SESSION_KEY, "1");
  } catch {
    // ignore — private mode / blocked storage
  }
}

/**
 * Public landing splash — once per browser session.
 * Does not replay on route changes or landing → login → landing.
 */
export function LandingSplash() {
  const [phase, setPhase] = useState<SplashPhase>("boot");

  useLayoutEffect(() => {
    const win = window as SplashWindow;

    if (win.__ifranchiseSplashFinalizeTimer != null) {
      window.clearTimeout(win.__ifranchiseSplashFinalizeTimer);
      win.__ifranchiseSplashFinalizeTimer = undefined;
    }

    // Already finished this session (and not a Strict Mode remount mid-play).
    if (hasSplashBeenShown() && win.__ifranchiseSplashLock !== "play") {
      setPhase("gone");
      delete document.documentElement.dataset.landingSplash;
      return;
    }

    let cancelled = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const exitAt = reduced ? REDUCED_EXIT_MS : FULL_EXIT_MS;
    const goneAt = reduced ? REDUCED_GONE_MS : FULL_GONE_MS;

    // Claim immediately so navigating to login mid-splash cannot replay later.
    win.__ifranchiseSplashLock = "play";
    markSplashShown();
    document.documentElement.dataset.landingSplash = "playing";
    setPhase("play");

    const exitTimer = window.setTimeout(() => {
      if (cancelled) return;
      setPhase("exit");
    }, exitAt);

    const goneTimer = window.setTimeout(() => {
      if (cancelled) return;
      win.__ifranchiseSplashLock = "done";
      setPhase("gone");
      delete document.documentElement.dataset.landingSplash;
    }, goneAt);

    return () => {
      cancelled = true;
      window.clearTimeout(exitTimer);
      window.clearTimeout(goneTimer);
      delete document.documentElement.dataset.landingSplash;

      // Defer "done" so React Strict Mode remount can resume play.
      // Real navigation away finalizes after this tick → no replay on return.
      win.__ifranchiseSplashFinalizeTimer = window.setTimeout(() => {
        win.__ifranchiseSplashLock = "done";
        win.__ifranchiseSplashFinalizeTimer = undefined;
      }, 0);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      className={cn(
        "landing-splash",
        phase === "boot" && "landing-splash--boot",
        phase === "play" && "landing-splash--play",
        phase === "exit" && "landing-splash--exit",
      )}
      role="presentation"
      aria-hidden="true"
    >
      <div className="landing-splash-bg" />
      <div className="landing-splash-orb landing-splash-orb--a" />
      <div className="landing-splash-orb landing-splash-orb--b" />
      <div className="landing-splash-orb landing-splash-orb--c" />

      <div className="landing-splash-content">
        <div className="landing-splash-brand">
          <span className="landing-splash-mark">
            <span className="landing-splash-ripple" aria-hidden />
            <svg className="landing-splash-ring" viewBox="0 0 88 88" aria-hidden>
              <rect x="5" y="5" width="78" height="78" rx="20" ry="20" />
            </svg>
            <Image
              src={brandLogo}
              alt=""
              width={112}
              height={112}
              priority
              className="landing-splash-logo"
            />
          </span>
          <span className="landing-splash-wordmark">iFranchise</span>
        </div>

        <p className="landing-splash-tagline">Empowering People. Simplifying Work.</p>
        <span className="landing-splash-rule" aria-hidden />
      </div>
    </div>
  );
}
