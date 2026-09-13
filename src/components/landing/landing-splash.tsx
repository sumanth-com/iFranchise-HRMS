"use client";

import Image from "next/image";
import { useLayoutEffect, useState } from "react";

import brandLogo from "@/assets/brand/if-mark.png";
import { BRAND_NAME } from "@/lib/brand/constants";
import { cn } from "@/lib/utils";

/** Session-scoped: splash once per browser tab/session, including return from login. */
export const LANDING_SPLASH_SESSION_KEY = "ifranchise.landing.splash.v3";

/** Full experience is exactly 5s including the exit fade. */
const FULL_EXIT_MS = 4450;
const FULL_GONE_MS = 5000;
const REDUCED_EXIT_MS = 280;
const REDUCED_GONE_MS = 520;

/** Splash-only tagline order for the brand sequence. */
const SPLASH_TAGLINE = "CONNECT. GROW. EXPAND.";

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

function ConceptIconConnect() {
  return (
    <svg viewBox="0 0 48 48" className="landing-splash-concept-icon" aria-hidden>
      <circle cx="12" cy="24" r="3.5" />
      <circle cx="36" cy="13" r="3.5" />
      <circle cx="36" cy="35" r="3.5" />
      <path d="M15.4 22.4 32.6 14.6M15.4 25.6 32.6 33.4" />
      <circle cx="24" cy="24" r="2.25" />
    </svg>
  );
}

function ConceptIconGrow() {
  return (
    <svg viewBox="0 0 48 48" className="landing-splash-concept-icon" aria-hidden>
      <path d="M10 34h28" />
      <path d="M14 34V26M22 34V20M30 34V15M36 34V10" />
      <path d="M32 12h6v6" />
      <path d="M22 18 36 10" />
    </svg>
  );
}

function ConceptIconExpand() {
  return (
    <svg viewBox="0 0 48 48" className="landing-splash-concept-icon" aria-hidden>
      <rect x="18" y="18" width="12" height="12" rx="2.5" />
      <path d="M12 12h7M12 12v7M12 12l7 7" />
      <path d="M36 12h-7M36 12v7M36 12l-7 7" />
      <path d="M12 36h7M12 36v-7M12 36l7-7" />
      <path d="M36 36h-7M36 36v-7M36 36l-7-7" />
    </svg>
  );
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
        <div className="landing-splash-stage">
          <div className="landing-splash-concepts" aria-hidden>
            <div className="landing-splash-concept landing-splash-concept--connect">
              <span className="landing-splash-concept-glyph">
                <ConceptIconConnect />
              </span>
              <span className="landing-splash-concept-label">CONNECT</span>
            </div>
            <div className="landing-splash-concept landing-splash-concept--grow">
              <span className="landing-splash-concept-glyph">
                <ConceptIconGrow />
              </span>
              <span className="landing-splash-concept-label">GROW</span>
            </div>
            <div className="landing-splash-concept landing-splash-concept--expand">
              <span className="landing-splash-concept-glyph">
                <ConceptIconExpand />
              </span>
              <span className="landing-splash-concept-label">EXPAND</span>
            </div>
          </div>

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
                className="landing-splash-logo size-[92%] object-contain"
              />
            </span>
            <span className="landing-splash-wordmark-lockup">
              <span className="landing-splash-wordmark">{BRAND_NAME}</span>
              <span className="landing-splash-tagline">{SPLASH_TAGLINE}</span>
            </span>
          </div>
        </div>
        <span className="landing-splash-rule" aria-hidden />
      </div>
    </div>
  );
}
