"use client";

import { useEffect } from "react";

import { useOnboardingPortalProgress } from "@/components/onboarding/candidate/onboarding-portal-progress-context";

export function OnboardingPortalProgressSync({ completionPercent }: { completionPercent: number }) {
  const setCompletionPercent = useOnboardingPortalProgress()?.setCompletionPercent;

  useEffect(() => {
    if (!setCompletionPercent) return;
    setCompletionPercent(completionPercent);
  }, [completionPercent, setCompletionPercent]);

  return null;
}
