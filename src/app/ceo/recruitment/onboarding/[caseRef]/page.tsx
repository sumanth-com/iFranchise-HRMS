import { notFound, redirect } from "next/navigation";

import { OnboardingReviewView } from "@/components/onboarding/hr/onboarding-review-view";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import { loadOnboardingReviewPageData } from "@/lib/onboarding/loaders/hr-onboarding-loaders";
import { isOnboardingCaseUuid } from "@/lib/onboarding/routing";

type PageProps = {
  params: Promise<{ caseRef: string }>;
};

export default async function CeoOnboardingDetailPage({ params }: PageProps) {
  await requireCeoPortal();

  const { caseRef } = await params;
  const listHref = `${CEO_ROUTES.recruitment}/onboarding`;

  try {
    const { detail, routeRef } = await loadOnboardingReviewPageData(caseRef);

    if (isOnboardingCaseUuid(caseRef) && caseRef !== routeRef) {
      redirect(`${listHref}/${routeRef}`);
    }

    return (
      <OnboardingReviewView
        detail={detail}
        readOnly
        listHref={listHref}
      />
    );
  } catch {
    notFound();
  }
}
