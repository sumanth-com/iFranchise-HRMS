import { OnboardingLoginForm } from "@/components/onboarding/candidate/onboarding-login-form";

export const dynamic = "force-dynamic";

export default function OnboardingLoginPage() {
  return (
    <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 items-center justify-center py-6">
      <OnboardingLoginForm />
    </div>
  );
}
