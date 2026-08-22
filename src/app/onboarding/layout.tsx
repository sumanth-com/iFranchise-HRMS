import type { Metadata } from "next";

import { OnboardingPortalHeader } from "@/components/onboarding/candidate/onboarding-portal-header";
import { OnboardingPortalProgressProvider } from "@/components/onboarding/candidate/onboarding-portal-progress-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Onboarding",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overscroll-x-none bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.35] dark:opacity-[0.18]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-background/90 via-transparent to-background/95"
        aria-hidden
      />

      <OnboardingPortalProgressProvider>
        <OnboardingPortalHeader />

        <main className="relative mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col overflow-hidden px-4 py-2 min-h-0">
          {children}
        </main>
      </OnboardingPortalProgressProvider>
    </div>
  );
}
