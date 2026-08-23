import { Sparkles } from "lucide-react";

export function WhatsNewEmptyState() {
  return (
    <div className="landing-empty-state landing-animate-up">
      <div className="landing-empty-visual" aria-hidden>
        <div className="landing-empty-orbit">
          <Sparkles className="size-6 text-sky-400" strokeWidth={2.2} />
        </div>
      </div>
      <h2 className="landing-section-title text-2xl sm:text-3xl">
        You&apos;re all caught up.
      </h2>
      <p className="landing-section-copy mx-auto mt-3 max-w-lg">
        There aren&apos;t any new HRMS updates to show right now. Check back here
        as we continue improving your workplace experience.
      </p>
    </div>
  );
}
