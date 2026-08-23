"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/common/button";
import { navigateToLogin } from "@/lib/landing/navigate-to-login";

export function LandingHeroSignInButton() {
  return (
    <Button
      type="button"
      onClick={navigateToLogin}
      className="group landing-cta inline-flex h-12 items-center justify-center gap-2.5 rounded-full px-8 text-sm font-semibold"
    >
      Sign in to HRMS
      <span
        className="inline-flex size-5 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden
      >
        <ArrowRight className="size-3.5" strokeWidth={2.75} />
      </span>
    </Button>
  );
}
