"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/candidate/onboarding-wizard";
import { OnboardingPortalProgressSync } from "@/components/onboarding/candidate/onboarding-portal-progress-sync";
import { getCandidatePortalContextAction } from "@/lib/onboarding/actions/candidate-onboarding-actions";
import type { CandidatePortalContext } from "@/types/onboarding";

export default function OnboardingPortalPage() {
  const router = useRouter();
  const [context, setContext] = useState<CandidatePortalContext | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    const data = await getCandidatePortalContextAction();
    setContext(data);
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
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
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
