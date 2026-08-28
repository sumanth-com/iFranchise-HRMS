"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
  const [completionPercent, setCompletionPercentState] = useState<number | null>(null);
  const [wizardStep, setWizardStepState] = useState<OnboardingPortalWizardStep | null>(null);

  // Consumers report progress from an effect that also depends on this context, so
  // an unchanged write must not produce a new state value: doing so gives the memo
  // below a fresh identity, re-fires the reporting effect, and loops until React
  // aborts with "Maximum update depth exceeded" — which blanks the whole wizard.
  const setCompletionPercent = useCallback((percent: number | null) => {
    setCompletionPercentState((prev) => (prev === percent ? prev : percent));
  }, []);

  const setWizardStep = useCallback((step: OnboardingPortalWizardStep | null) => {
    setWizardStepState((prev) => {
      if (prev === step) return prev;
      if (prev && step && prev.current === step.current && prev.total === step.total) {
        return prev;
      }
      return step;
    });
  }, []);

  const value = useMemo(
    () => ({ completionPercent, setCompletionPercent, wizardStep, setWizardStep }),
    [completionPercent, setCompletionPercent, wizardStep, setWizardStep],
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
