import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { whatsNewUpdates } from "@/config/whats-new-updates";
import { PublicNavbarMinimal } from "@/components/landing/public-navbar";
import { WhatsNewEmptyState } from "@/components/whats-new/whats-new-empty-state";
import { WhatsNewUpdateCard } from "@/components/whats-new/whats-new-update-card";
import { WHATS_NEW_ROUTE } from "@/lib/auth/constants";

export function WhatsNewPageContent() {
  const hasUpdates = whatsNewUpdates.length > 0;

  return (
    <div className="landing-page min-h-screen">
      <div className="landing-ambient landing-ambient--subtle" aria-hidden />
      <PublicNavbarMinimal />

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to HRMS home
        </Link>

        <header className="mt-8 max-w-2xl landing-animate-up">
          <h1 className="landing-section-title text-3xl sm:text-4xl">
            What&apos;s new in your workplace
          </h1>
          <p className="landing-section-copy mt-4">
            Discover the latest features, improvements and updates we&apos;ve added
            to your HRMS experience.
          </p>
        </header>

        <div className="mt-12">
          {hasUpdates ? (
            <div className="space-y-5">
              {whatsNewUpdates.map((update) => (
                <WhatsNewUpdateCard key={update.slug} update={update} />
              ))}
            </div>
          ) : (
            <WhatsNewEmptyState />
          )}
        </div>
      </main>
    </div>
  );
}
