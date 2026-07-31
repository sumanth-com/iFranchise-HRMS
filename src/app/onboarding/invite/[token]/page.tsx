import { OnboardingInviteSetup } from "@/components/onboarding/candidate/onboarding-invite-setup";
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
      <div className="mx-auto max-w-md rounded-xl border p-6 text-center">
        <h1 className="text-lg font-semibold">Invitation unavailable</h1>
        <p className="text-sm text-muted-foreground mt-2">{validation.reason}</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <OnboardingInviteSetup
        token={token}
        personalEmail={validation.data.personalEmail}
        fullName={validation.data.fullName}
      />
    </div>
  );
}
