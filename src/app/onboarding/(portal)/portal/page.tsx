"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { OnboardingWizard } from "@/components/onboarding/candidate/onboarding-wizard";
import { OnboardingPortalProgressSync } from "@/components/onboarding/candidate/onboarding-portal-progress-sync";
import { getCandidatePortalContextAction } from "@/lib/onboarding/actions/candidate-onboarding-actions";
import type { CandidatePortalContext } from "@/types/onboarding";

export default function OnboardingPortalPage() {
  const router = useRouter();
  const [context, setContext] = useState<CandidatePortalContext | null | undefined>(undefined);

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
    } catch (error) {
      console.error("[onboarding-portal] context refresh failed", error);
      if (seq !== refreshSeqRef.current) return;
      toast.error("Could not load your onboarding data. Please try again.");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (context === null) {
      router.replace("/onboarding/login");
    }
  }, [context, router]);

  if (context === undefined) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-8">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading your onboarding portal…</p>
      </div>
    );
  }

  if (!context) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <OnboardingPortalProgressSync completionPercent={context.completionPercent} />
      {context.correctionNotes ? (
        <div className="shrink-0 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-950 dark:text-orange-100">
          <strong>HR corrections:</strong> {context.correctionNotes}
        </div>
      ) : null}

      <OnboardingWizard context={context} onRefresh={refresh} />
    </div>
  );
}
