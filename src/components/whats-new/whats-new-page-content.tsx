import { whatsNewUpdates } from "@/config/whats-new-updates";
import { LandingFooter } from "@/components/landing/landing-cta-footer";
import { PublicNavbar } from "@/components/landing/public-navbar";
import { WhatsNewEmptyState } from "@/components/whats-new/whats-new-empty-state";
import { WhatsNewUpdateCard } from "@/components/whats-new/whats-new-update-card";

export function WhatsNewPageContent() {
  const hasUpdates = whatsNewUpdates.length > 0;

  return (
    <div className="landing-page landing-whats-new-page">
      <div className="landing-ambient landing-ambient--subtle" aria-hidden />
      <PublicNavbar />

      <main className="landing-whats-new-main">
        <div className="landing-whats-new-inner">
          {hasUpdates ? (
            <>
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
            </>
          ) : (
            <WhatsNewEmptyState />
          )}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
