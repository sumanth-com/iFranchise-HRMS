"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/common/button";
import { navigateToLogin } from "@/lib/landing/navigate-to-login";

export function LandingHeroSignInButton() {
  return (
    <Button
      type="button"
      onClick={navigateToLogin}
      className="group landing-hero-cta inline-flex h-12 items-center justify-center gap-2.5 rounded-full px-8 text-[0.95rem] font-bold tracking-tight"
    >
      Sign in to HRMS
      <ArrowRight
        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
        strokeWidth={2.5}
        aria-hidden
      />
    </Button>
  );
}
