"use client";

import { LandingFeaturesSection } from "@/components/landing/landing-sections";
import {
  LandingFinalCta,
  LandingFooter,
  LandingPeopleSection,
  LandingSecuritySection,
} from "@/components/landing/landing-cta-footer";
import { LandingCtaProvider } from "@/components/landing/landing-cta-provider";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingLightMode } from "@/components/landing/landing-light-mode";
import { LandingSplash } from "@/components/landing/landing-splash";
import { PublicNavbar } from "@/components/landing/public-navbar";

export function LandingPageShell() {
  return (
    <LandingLightMode>
      <LandingCtaProvider>
        <LandingSplash />
        <div className="landing-page landing-page--vivid-hero landing-page--light-locked">
          <div className="landing-ambient" aria-hidden />
          <PublicNavbar />
          <main>
            <LandingHero />
            <LandingFeaturesSection />
            <LandingPeopleSection />
            <LandingSecuritySection />
            <LandingFinalCta />
          </main>
          <LandingFooter />
        </div>
      </LandingCtaProvider>
    </LandingLightMode>
  );
}
