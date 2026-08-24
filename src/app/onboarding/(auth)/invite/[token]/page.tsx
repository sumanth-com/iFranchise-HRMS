import { redirect } from "next/navigation";

import { OnboardingInviteSetup } from "@/components/onboarding/candidate/onboarding-invite-setup";
import { OnboardingInviteUnavailable } from "@/components/onboarding/candidate/onboarding-invite-unavailable";
import { validateInviteTokenAction } from "@/lib/onboarding/actions/candidate-onboarding-actions";
import { ONBOARDING_ROUTES } from "@/types/onboarding";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function OnboardingInvitePage({ params }: PageProps) {
  const { token } = await params;
  const validation = await validateInviteTokenAction(token);

  if (!validation.ok) {
    if (validation.reason === "PASSWORD_ALREADY_SET" && validation.personalEmail) {
      redirect(
        `${ONBOARDING_ROUTES.login}?email=${encodeURIComponent(validation.personalEmail)}&setup=done`,
      );
    }
    return <OnboardingInviteUnavailable reason={validation.reason} />;
  }

  return (
    <OnboardingInviteSetup
      token={token}
      personalEmail={validation.data.personalEmail}
      fullName={validation.data.fullName}
    />
  );
}
