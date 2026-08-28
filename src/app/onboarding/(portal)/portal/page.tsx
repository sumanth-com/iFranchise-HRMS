"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ClientSectionBoundary } from "@/components/common/client-section-boundary";
import { ErrorState } from "@/components/common/error-state";
import { OnboardingWizard } from "@/components/onboarding/candidate/onboarding-wizard";
import { OnboardingPortalProgressSync } from "@/components/onboarding/candidate/onboarding-portal-progress-sync";
import { getCandidatePortalContextAction } from "@/lib/onboarding/actions/candidate-onboarding-actions";
import type { CandidatePortalContext } from "@/types/onboarding";

const LOAD_ERROR_TITLE = "We couldn't load this section";
const LOAD_ERROR_DESCRIPTION = "Your saved progress is safe. Please try again.";

/** Mirrors the wizard card so the content area is never an empty white block. */
function OnboardingPortalSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading your onboarding portal"
      className="mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/5 ring-1 ring-border/50">
        <div className="flex shrink-0 gap-2 border-b border-border/60 px-4 py-3 sm:px-6">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-muted" />
          ))}
        </div>

        <div className="shrink-0 space-y-2 border-b border-border/60 px-4 py-3 sm:px-6">
          <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-3.5 w-72 animate-pulse rounded bg-muted/70" />
        </div>

        <div className="min-h-0 flex-1 px-4 py-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-muted/70" />
                <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3 sm:px-6">
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPortalPage() {
  const router = useRouter();
  const [context, setContext] = useState<CandidatePortalContext | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);

  // Uploads and section saves can each trigger a refetch, so responses may arrive
  // out of order. Only apply the newest one, otherwise a slow earlier request can
  // overwrite fresher data and make just-saved values look like they vanished.
  const refreshSeqRef = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++refreshSeqRef.current;
    try {
      const data = await getCandidatePortalContextAction();
      if (seq !== refreshSeqRef.current) return;
      setContext(data);
      setLoadFailed(false);
    } catch (error) {
      console.error("[onboarding-portal] context refresh failed", error);
      if (seq !== refreshSeqRef.current) return;
      // Data already on screen stays on screen: a failed background refresh must
      // never blank out a section the candidate is part-way through filling in.
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (context === null) {
      router.replace("/onboarding/login");
    }
  }, [context, router]);

  if (context === undefined) {
    return loadFailed ? (
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-8">
        <ErrorState
          title={LOAD_ERROR_TITLE}
          description={LOAD_ERROR_DESCRIPTION}
          retryLabel="Retry"
          onRetry={() => {
            setLoadFailed(false);
            void refresh();
          }}
          className="w-full max-w-md"
        />
      </div>
    ) : (
      <OnboardingPortalSkeleton />
    );
  }

  // context === null means no valid session; the effect above redirects to login.
  // Keep the skeleton up meanwhile rather than flashing an empty screen.
  if (!context) {
    return <OnboardingPortalSkeleton />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <OnboardingPortalProgressSync completionPercent={context.completionPercent} />
      {context.correctionNotes ? (
        <div className="shrink-0 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-950 dark:text-orange-100">
          <strong>HR corrections:</strong> {context.correctionNotes}
        </div>
      ) : null}

      <ClientSectionBoundary
        title={LOAD_ERROR_TITLE}
        description={LOAD_ERROR_DESCRIPTION}
        retryLabel="Retry"
        className="m-auto w-full max-w-md"
        contentClassName="contents"
      >
        <OnboardingWizard context={context} onRefresh={refresh} />
      </ClientSectionBoundary>
    </div>
  );
}
