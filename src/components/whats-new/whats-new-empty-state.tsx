import { Sparkles } from "lucide-react";

export function WhatsNewEmptyState() {
  return (
    <div className="landing-empty-state landing-animate-up">
      <div className="landing-empty-visual" aria-hidden>
        <div className="landing-empty-orbit">
          <Sparkles className="size-5" strokeWidth={2.2} />
        </div>
      </div>
      <h1 className="landing-empty-title">You&apos;re all caught up.</h1>
      <p className="landing-empty-copy">
        There aren&apos;t any new HRMS updates to show right now. Check back
        here as we continue improving your workplace experience.
      </p>
    </div>
  );
}
