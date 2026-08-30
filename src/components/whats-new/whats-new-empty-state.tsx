import { WhatsNewHeroBackground } from "@/components/whats-new/whats-new-hero-background";
import { WhatsNewRobot } from "@/components/whats-new/whats-new-robot";

export function WhatsNewEmptyState() {
  return (
    <div className="whats-new-empty-stage">
      <WhatsNewHeroBackground />

      <div className="whats-new-empty-state landing-animate-up">
        <div className="whats-new-empty-visual">
          <WhatsNewRobot />
        </div>

        <header className="whats-new-empty-copy">
          <p className="landing-hero-pill">Product updates</p>
          <h1 className="landing-hero-title whats-new-empty-title">
            What&apos;s new in{" "}
            <span className="landing-hero-accent">iFranchise HRMS</span>
          </h1>
          <p className="landing-hero-subtitle whats-new-empty-subtitle">
            New features, fixes, and improvements for your workplace — published here
            as we release them.
          </p>
        </header>
      </div>
    </div>
  );
}
