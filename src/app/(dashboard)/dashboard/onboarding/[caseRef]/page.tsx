import { redirect } from "next/navigation";

import { ONBOARDING_ROUTES } from "@/types/onboarding";

type PageProps = {
  params: Promise<{ caseRef: string }>;
};

export default async function OnboardingLegacyDetailRedirect({ params }: PageProps) {
  const { caseRef } = await params;
  redirect(ONBOARDING_ROUTES.hrDetail(caseRef));
}
