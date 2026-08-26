import { LandingHeroOrbitIcons } from "@/components/landing/landing-hero-orbit-icons";
import { LandingHeroPortalPreview } from "@/components/landing/landing-hero-portal-preview";
import { LandingHeroSignInButton } from "@/components/landing/landing-hero-sign-in-button";

export function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-heading">
      <div className="landing-hero-bg" aria-hidden>
        <div className="landing-hero-bg-base" />
        <div className="landing-hero-bg-glow landing-hero-bg-glow--primary" />
        <div className="landing-hero-bg-glow landing-hero-bg-glow--secondary" />
        <div className="landing-hero-bg-glow landing-hero-bg-glow--accent" />
        <div className="landing-hero-bg-particles" />
        <div className="landing-hero-side-frame">
          <svg
            className="landing-hero-side-wave landing-hero-side-wave--left"
            viewBox="0 0 640 360"
            preserveAspectRatio="xMinYMax meet"
            aria-hidden
          >
            <path
              d="M-40 360C80 290 160 250 260 240C380 228 460 270 520 320C560 350 600 360 640 360H-40Z"
              fill="rgba(237,233,254,0.18)"
            />
            <path
              d="M-40 360C100 310 190 275 290 268C400 260 470 295 530 335C570 355 610 360 640 360H-40Z"
              fill="rgba(196,181,253,0.16)"
            />
            <path
              d="M-40 360C120 325 210 300 300 296C410 290 480 315 540 345C575 358 615 360 640 360H-40Z"
              fill="rgba(255,255,255,0.1)"
            />
          </svg>
          <svg
            className="landing-hero-side-wave landing-hero-side-wave--right"
            viewBox="0 0 640 360"
            preserveAspectRatio="xMaxYMax meet"
            aria-hidden
          >
            <path
              d="M680 360C560 290 480 250 380 240C260 228 180 270 120 320C80 350 40 360 0 360H680Z"
              fill="rgba(237,233,254,0.18)"
            />
            <path
              d="M680 360C540 310 450 275 350 268C240 260 170 295 110 335C70 355 30 360 0 360H680Z"
              fill="rgba(196,181,253,0.16)"
            />
            <path
              d="M680 360C520 325 430 300 340 296C230 290 160 315 100 345C65 358 25 360 0 360H680Z"
              fill="rgba(255,255,255,0.1)"
            />
          </svg>
        </div>
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
