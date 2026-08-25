import { LandingHeroOrbitIcons } from "@/components/landing/landing-hero-orbit-icons";
import { LandingHeroPortalPreview } from "@/components/landing/landing-hero-portal-preview";
import { LandingHeroSignInButton } from "@/components/landing/landing-hero-sign-in-button";

export function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-heading">
      <div className="landing-hero-bg" aria-hidden />

      <div className="landing-hero-inner mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10">
        <div className="landing-hero-stage landing-animate-up">
          <LandingHeroOrbitIcons />

          <div className="landing-hero-copy">
            <h1 id="landing-hero-heading" className="landing-hero-title">
              <span className="landing-hero-title-line">Your workday, simplified.</span>
              <span className="landing-hero-title-line landing-hero-accent">
                One platform for everyone.
              </span>
            </h1>
            <p className="landing-hero-subtitle">
              Attendance, leave, payroll and people — together in one clean
              workplace experience.
            </p>
            <div className="landing-hero-actions">
              <LandingHeroSignInButton />
            </div>
          </div>
        </div>

        <div className="landing-hero-mesh" aria-hidden />

        <LandingHeroPortalPreview />
      </div>
    </section>
  );
}
