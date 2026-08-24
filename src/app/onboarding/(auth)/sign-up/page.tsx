import { redirect } from "next/navigation";
import { Suspense } from "react";

import { OnboardingSignUpRedirect } from "@/components/onboarding/candidate/onboarding-sign-up-redirect";
import { onboardingEmailHasPasswordAction } from "@/lib/onboarding/actions/candidate-onboarding-actions";
import { ONBOARDING_ROUTES } from "@/types/onboarding";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function OnboardingSignUpPage({ searchParams }: PageProps) {
  const { email } = await searchParams;
  const normalized = email?.trim().toLowerCase() ?? "";

  if (normalized && (await onboardingEmailHasPasswordAction(normalized))) {
    redirect(
      `${ONBOARDING_ROUTES.login}?email=${encodeURIComponent(normalized)}&setup=done`,
    );
  }

  return (
    <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}>
      <OnboardingSignUpRedirect />
    </Suspense>
  );
}
