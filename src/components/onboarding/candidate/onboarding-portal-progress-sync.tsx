"use client";

import { useEffect } from "react";

import { useOnboardingPortalProgress } from "@/components/onboarding/candidate/onboarding-portal-progress-context";

export function OnboardingPortalProgressSync({ completionPercent }: { completionPercent: number }) {
  const ctx = useOnboardingPortalProgress();

  useEffect(() => {
    if (!ctx) return;
    ctx.setCompletionPercent(completionPercent);
    return () => ctx.setCompletionPercent(null);
  }, [completionPercent, ctx]);

  return null;
}
