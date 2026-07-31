"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/candidate/onboarding-wizard";
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
    return <p className="text-center text-muted-foreground">Loading onboarding portal...</p>;
  }

  if (!context) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{context.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          Joining {context.joiningDate ?? "soon"} · {context.completionPercent}% complete
        </p>
        {context.correctionNotes && (
          <p className="mt-2 text-sm rounded-lg border border-orange-200 bg-orange-50 p-3">
            HR requested corrections: {context.correctionNotes}
          </p>
        )}
      </div>
      <OnboardingWizard context={context} onRefresh={refresh} />
    </div>
  );
}
