"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type OnboardingPortalProgressContextValue = {
  completionPercent: number | null;
  setCompletionPercent: (percent: number | null) => void;
};

const OnboardingPortalProgressContext =
  createContext<OnboardingPortalProgressContextValue | null>(null);

export function OnboardingPortalProgressProvider({ children }: { children: ReactNode }) {
  const [completionPercent, setCompletionPercent] = useState<number | null>(null);
  const value = useMemo(
    () => ({ completionPercent, setCompletionPercent }),
    [completionPercent],
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
