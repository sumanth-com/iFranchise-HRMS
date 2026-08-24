import { Suspense } from "react";

import { OnboardingLoginForm } from "@/components/onboarding/candidate/onboarding-login-form";

export const dynamic = "force-dynamic";

export default function OnboardingLoginPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}>
      <OnboardingLoginForm />
    </Suspense>
  );
}
