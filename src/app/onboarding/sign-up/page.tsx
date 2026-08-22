import { Suspense } from "react";

import { OnboardingSignUpRedirect } from "@/components/onboarding/candidate/onboarding-sign-up-redirect";

export const dynamic = "force-dynamic";

export default function OnboardingSignUpPage() {
  return (
    <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 items-center justify-center py-6">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading password setup…</p>
          </div>
        }
      >
        <OnboardingSignUpRedirect />
      </Suspense>
    </div>
  );
}
