import { OnboardingInviteSetup } from "@/components/onboarding/candidate/onboarding-invite-setup";
import { OnboardingInviteUnavailable } from "@/components/onboarding/candidate/onboarding-invite-unavailable";
import { validateInviteTokenAction } from "@/lib/onboarding/actions/candidate-onboarding-actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function OnboardingInvitePage({ params }: PageProps) {
  const { token } = await params;
  const validation = await validateInviteTokenAction(token);

  if (!validation.ok) {
    return (
      <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 items-center justify-center py-6">
        <OnboardingInviteUnavailable reason={validation.reason} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 items-center justify-center py-6">
      <OnboardingInviteSetup
        token={token}
        personalEmail={validation.data.personalEmail}
        fullName={validation.data.fullName}
      />
    </div>
  );
}
