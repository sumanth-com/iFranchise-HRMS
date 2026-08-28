"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/common/button";
import { useLandingCta } from "@/components/landing/landing-cta-provider";

export function LandingHeroSignInButton() {
  const { handleLandingCta, isMobileOrTablet } = useLandingCta();

  return (
    <Button
      type="button"
      onClick={handleLandingCta}
      className="group landing-hero-cta inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full px-8 text-[0.95rem] font-bold tracking-tight sm:w-auto"
    >
      {isMobileOrTablet ? "Get Started" : "Sign in to HRMS"}
      <ArrowRight
        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
        strokeWidth={2.5}
        aria-hidden
      />
    </Button>
  );
}
