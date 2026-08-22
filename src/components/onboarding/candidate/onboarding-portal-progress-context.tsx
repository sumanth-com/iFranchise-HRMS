"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type OnboardingPortalWizardStep = {
  current: number;
  total: number;
};

type OnboardingPortalProgressContextValue = {
  completionPercent: number | null;
  setCompletionPercent: (percent: number | null) => void;
  wizardStep: OnboardingPortalWizardStep | null;
  setWizardStep: (step: OnboardingPortalWizardStep | null) => void;
};

const OnboardingPortalProgressContext =
  createContext<OnboardingPortalProgressContextValue | null>(null);

export function OnboardingPortalProgressProvider({ children }: { children: ReactNode }) {
  const [completionPercent, setCompletionPercent] = useState<number | null>(null);
  const [wizardStep, setWizardStep] = useState<OnboardingPortalWizardStep | null>(null);
  const value = useMemo(
    () => ({ completionPercent, setCompletionPercent, wizardStep, setWizardStep }),
    [completionPercent, wizardStep],
  );

  return (
    <OnboardingPortalProgressContext.Provider value={value}>
      {children}
    </OnboardingPortalProgressContext.Provider>
  );
}

export function useOnboardingPortalProgress() {
  return useContext(OnboardingPortalProgressContext);
}
