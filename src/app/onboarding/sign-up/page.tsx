import { OnboardingSignUpInfo } from "@/components/onboarding/candidate/onboarding-sign-up-info";

export const dynamic = "force-dynamic";

export default function OnboardingSignUpPage() {
  return (
    <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 items-center justify-center py-6">
      <OnboardingSignUpInfo />
    </div>
  );
}
