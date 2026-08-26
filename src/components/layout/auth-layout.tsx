"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { User } from "lucide-react";

import brandLogo from "@/assets/Logo.png";
import { AuthThemeToggle } from "@/components/auth/auth-theme-toggle";
import { PUBLIC_LANDING_ROUTE } from "@/lib/auth/constants";
import { consumeLandingToLoginTransition } from "@/lib/landing/navigate-to-login";
import { cn } from "@/lib/utils";

type AuthLayoutProps = {
  children: ReactNode;
};

/** 7 icons evenly spaced on a circle around the orb (degrees from top). */
const PEOPLE = [
  { angle: "0deg" },
  { angle: "51.428deg" },
  { angle: "102.857deg" },
  { angle: "154.286deg" },
  { angle: "205.714deg" },
  { angle: "257.143deg" },
  { angle: "308.571deg" },
] as const;

function AuthGlassOrb() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="auth-glass-stage" suppressHydrationWarning>
      <Link
        href={PUBLIC_LANDING_ROUTE}
        className="auth-glass-brand rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        aria-label="Go to HRMS home"
      >
        <div className="auth-logo-shine auth-glass-brand-mark">
          <Image
            src={brandLogo}
            alt=""
            width={52}
            height={52}
            priority
            className="relative z-0 size-full object-contain"
          />
        </div>
        <p className="auth-glass-brand-name">iFranchise</p>
      </Link>

      <div className="auth-glass-aurora auth-glass-aurora-a" aria-hidden />
      <div className="auth-glass-aurora auth-glass-aurora-b" aria-hidden />
      <div className="auth-glass-aurora auth-glass-aurora-c" aria-hidden />
      <div className="auth-glass-grid" aria-hidden />

      <div className="auth-glass-stage-center" aria-hidden>
        {mounted ? (
          <div className="auth-glass-bounce">
            <div className="auth-glass-orb-cluster">
              <div className="auth-glass-people">
                {PEOPLE.map((person, index) => (
                  <span
                    key={index}
                    className="auth-glass-person"
                    style={{ "--angle": person.angle } as CSSProperties}
                  >
                    <User className="size-[1.15rem]" strokeWidth={2.35} />
                  </span>
                ))}
              </div>

              <div className="auth-glass-orb">
                <div className="auth-glass-orb-glow" />
                <div className="auth-glass-orb-body">
                  <div className="auth-glass-orb-core" />
                  <div className="auth-glass-orb-frost" />
                  <div className="auth-glass-orb-caustic" />
                  <div className="auth-glass-orb-specular" />
                  <div className="auth-glass-orb-rim" />
                </div>
              </div>
            </div>

            <div className="auth-glass-ground-shadow" />
          </div>
        ) : (
          <div className="auth-glass-bounce auth-glass-bounce--static">
            <div className="auth-glass-orb">
              <div className="auth-glass-orb-glow" />
              <div className="auth-glass-orb-body">
                <div className="auth-glass-orb-core" />
                <div className="auth-glass-orb-frost" />
                <div className="auth-glass-orb-caustic" />
                <div className="auth-glass-orb-specular" />
                <div className="auth-glass-orb-rim" />
              </div>
            </div>
            <div className="auth-glass-ground-shadow" />
          </div>
        )}
      </div>

      <div className="auth-glass-tagline">
        <p className="auth-glass-tagline-title">iFranchise HRMS</p>
        <p className="auth-glass-tagline-copy">
          Your complete people platform for attendance, leave, payroll, and
          performance.
        </p>
      </div>
    </div>
  );
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [fromLanding, setFromLanding] = useState(false);

  useEffect(() => {
    setFromLanding(consumeLandingToLoginTransition());
  }, []);

  return (
    <div
      className={cn(
        "relative flex h-[100dvh] w-screen max-w-[100vw] overflow-hidden bg-background",
        fromLanding && "auth-enter-from-landing",
      )}
    >
      <aside className="relative hidden min-w-0 flex-1 p-3 lg:block xl:p-4">
        <AuthGlassOrb />
      </aside>

      <main className="relative z-10 flex h-full w-full flex-col bg-background lg:w-[48%] lg:shrink-0 lg:border-l lg:border-border/50">
        <div className="absolute top-4 right-4 z-20 sm:top-5 sm:right-5">
          <AuthThemeToggle />
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-8 py-12 sm:px-12 lg:px-14 xl:px-16">
          <div className="mx-auto w-full max-w-[400px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
