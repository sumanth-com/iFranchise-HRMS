import { notFound } from "next/navigation";

import { OnboardingReviewView } from "@/components/onboarding/hr/onboarding-review-view";
import { loadOnboardingReviewPageData } from "@/lib/onboarding/loaders/hr-onboarding-loaders";
import { ONBOARDING_PERMISSIONS } from "@/lib/onboarding/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OnboardingDetailPage({ params }: PageProps) {
  await requireServerAnyPermission([
    ONBOARDING_PERMISSIONS.view,
    ONBOARDING_PERMISSIONS.manage,
    ONBOARDING_PERMISSIONS.review,
    ONBOARDING_PERMISSIONS.activate,
  ]);

  const { id } = await params;

  try {
    const { detail, roles } = await loadOnboardingReviewPageData(id);
    return <OnboardingReviewView detail={detail} roles={roles} />;
  } catch {
    notFound();
  }
}
