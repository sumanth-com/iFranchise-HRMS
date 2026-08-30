import { whatsNewUpdates } from "@/config/whats-new-updates";
import { LandingFooter } from "@/components/landing/landing-cta-footer";
import { PublicNavbar } from "@/components/landing/public-navbar";
import { WhatsNewEmptyState } from "@/components/whats-new/whats-new-empty-state";
import { WhatsNewUpdateCard } from "@/components/whats-new/whats-new-update-card";
import { cn } from "@/lib/utils";

export function WhatsNewPageContent() {
  const hasUpdates = whatsNewUpdates.length > 0;

  return (
    <div
      className={cn(
        "landing-page landing-whats-new-page landing-page--light-locked",
        !hasUpdates && "landing-whats-new-page--empty landing-page--vivid-hero",
      )}
    >
      {hasUpdates ? <div className="landing-ambient landing-ambient--subtle" aria-hidden /> : null}
      <PublicNavbar />

      <main
        className={cn(
          "landing-whats-new-main",
          !hasUpdates && "landing-whats-new-main--empty",
        )}
      >
        {hasUpdates ? (
          <div className="landing-whats-new-inner">
            <header className="landing-whats-new-header landing-animate-up">
              <h1 className="landing-section-title">
                What&apos;s new in your workplace
              </h1>
              <p className="landing-section-copy">
                Discover the latest features, improvements and updates we&apos;ve
                added to your HRMS experience.
              </p>
            </header>

            <div className="landing-whats-new-body">
              <div className="landing-whats-new-list">
                {whatsNewUpdates.map((update) => (
                  <WhatsNewUpdateCard key={update.slug} update={update} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <WhatsNewEmptyState />
        )}
      </main>

      <LandingFooter />
    </div>
  );
}
