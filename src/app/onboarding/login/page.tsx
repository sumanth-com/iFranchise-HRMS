import { OnboardingLoginForm } from "@/components/onboarding/candidate/onboarding-login-form";

export const dynamic = "force-dynamic";

export default function OnboardingLoginPage() {
  return (
    <div className="flex justify-center">
      <OnboardingLoginForm />
    </div>
  );
}
