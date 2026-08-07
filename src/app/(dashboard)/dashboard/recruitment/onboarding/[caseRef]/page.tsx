import { notFound, redirect } from "next/navigation";

import { OnboardingReviewView } from "@/components/onboarding/hr/onboarding-review-view";
import { loadOnboardingReviewPageData } from "@/lib/onboarding/loaders/hr-onboarding-loaders";
import { isOnboardingCaseUuid } from "@/lib/onboarding/routing";
import { ONBOARDING_PERMISSIONS } from "@/lib/onboarding/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { ONBOARDING_ROUTES } from "@/types/onboarding";

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
      redirect(ONBOARDING_ROUTES.hrDetail(routeRef));
    }

    return <OnboardingReviewView detail={detail} roles={roles} />;
  } catch {
    notFound();
  }
}
