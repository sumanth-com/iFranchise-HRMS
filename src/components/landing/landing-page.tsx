import { LandingFeaturesSection } from "@/components/landing/landing-sections";
import {
  LandingFinalCta,
  LandingFooter,
  LandingPeopleSection,
  LandingSecuritySection,
} from "@/components/landing/landing-cta-footer";
import { LandingHero } from "@/components/landing/landing-hero";
import { PublicNavbar } from "@/components/landing/public-navbar";

export function LandingPage() {
  return (
    <div className="landing-page landing-page--vivid-hero">
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
  );
}
