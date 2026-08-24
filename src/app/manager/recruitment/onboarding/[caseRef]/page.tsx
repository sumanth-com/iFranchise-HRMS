import { notFound, redirect } from "next/navigation";

import { OnboardingReviewView } from "@/components/onboarding/hr/onboarding-review-view";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { requireManagerPortal } from "@/lib/manager/load-admin-context";
import { loadOnboardingReviewPageData } from "@/lib/onboarding/loaders/hr-onboarding-loaders";
import { isOnboardingCaseUuid } from "@/lib/onboarding/routing";

type PageProps = {
  params: Promise<{ caseRef: string }>;
};

export default async function ManagerOnboardingDetailPage({ params }: PageProps) {
  await requireManagerPortal();

  const { caseRef } = await params;
  const listHref = MANAGER_ROUTES.recruitmentOnboarding;

  try {
    const { detail, roles, routeRef } = await loadOnboardingReviewPageData(caseRef);

    if (isOnboardingCaseUuid(caseRef) && caseRef !== routeRef) {
      redirect(`${listHref}/${routeRef}`);
    }

    return (
      <OnboardingReviewView
        detail={detail}
        roles={roles}
        listHref={listHref}
      />
    );
  } catch {
    notFound();
  }
}
