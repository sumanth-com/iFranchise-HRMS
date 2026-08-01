import { notFound, redirect } from "next/navigation";

import { OnboardingReviewView } from "@/components/onboarding/hr/onboarding-review-view";
import { loadOnboardingReviewPageData } from "@/lib/onboarding/loaders/hr-onboarding-loaders";
import { isOnboardingCaseUuid } from "@/lib/onboarding/routing";
import { ONBOARDING_PERMISSIONS } from "@/lib/onboarding/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";

type PageProps = {
  params: Promise<{ caseRef: string }>;
};

export default async function OnboardingDetailPage({ params }: PageProps) {
  await requireServerAnyPermission([
    ONBOARDING_PERMISSIONS.view,
    ONBOARDING_PERMISSIONS.manage,
    ONBOARDING_PERMISSIONS.review,
    ONBOARDING_PERMISSIONS.activate,
  ]);

  const { caseRef } = await params;

  try {
    const { detail, roles, routeRef } = await loadOnboardingReviewPageData(caseRef);

    if (isOnboardingCaseUuid(caseRef) && caseRef !== routeRef) {
      redirect(`/dashboard/onboarding/${routeRef}`);
    }

    return <OnboardingReviewView detail={detail} roles={roles} />;
  } catch {
    notFound();
  }
}
