import Image from "next/image";

import { LandingHeroOrbitIcons } from "@/components/landing/landing-hero-orbit-icons";
import { LandingHeroPortalPreview } from "@/components/landing/landing-hero-portal-preview";
import { LandingHeroSignInButton } from "@/components/landing/landing-hero-sign-in-button";

export function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-heading">
      <div className="landing-hero-bg" aria-hidden>
        {/* Realistic Wave Background Artwork */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#0a0026]">
          <Image
            src="/images/landing-hero-waves.png"
            alt=""
            fill
            priority
            quality={90}
            className="object-cover object-center opacity-95 mix-blend-screen"
          />
        </div>

        {/* Dynamic Glow and Particles */}
        <div className="landing-hero-bg-glow landing-hero-bg-glow--primary" />
        <div className="landing-hero-bg-glow landing-hero-bg-glow--secondary" />
        <div className="landing-hero-bg-glow landing-hero-bg-glow--accent" />
        <div className="landing-hero-bg-particles" />

        <div className="landing-hero-bg-fade" />
      </div>

      <div className="landing-hero-inner mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10">
        <div className="landing-hero-stage landing-animate-up">
          <LandingHeroOrbitIcons />

          <div className="landing-hero-copy">
            <p className="landing-hero-pill">All-in-one workplace HRMS</p>
            <h1 id="landing-hero-heading" className="landing-hero-title">
              <span className="landing-hero-title-line">Your workplace, simplified.</span>
              <span className="landing-hero-title-line landing-hero-accent">
                One HRMS for every role.
              </span>
            </h1>
            <p className="landing-hero-subtitle">
              Attendance, leave, payroll and people — in one clean platform your
              whole team can use.
            </p>
            <div className="landing-hero-actions">
              <LandingHeroSignInButton />
            </div>
          </div>
        </div>

        <LandingHeroPortalPreview />
      </div>
    </section>
  );
}
