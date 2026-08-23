import { LandingHeroSignInButton } from "@/components/landing/landing-hero-sign-in-button";

export function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-heading">
      <div className="landing-hero-bg" aria-hidden />

      <div className="landing-hero-inner mx-auto w-full max-w-3xl px-5 sm:px-8">
        <div className="landing-hero-copy landing-animate-up">
          <p className="landing-eyebrow">Employee Workplace Platform</p>
          <h1 id="landing-hero-heading" className="landing-hero-title">
            Everything at work.<span className="landing-gradient-text"> In one place.</span>
          </h1>
          <p className="landing-hero-subtitle">
            Manage your everyday work, attendance, leave, payroll and employee
            information through one simple workplace platform.
          </p>
          <div className="landing-hero-actions">
            <LandingHeroSignInButton />
          </div>
        </div>
      </div>
    </section>
  );
}
