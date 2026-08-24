import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { OnboardingDashboardView } from "@/components/onboarding/hr/onboarding-dashboard-view";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { requireManagerPortal } from "@/lib/manager/load-admin-context";
import { loadOnboardingModuleData } from "@/lib/onboarding/loaders/hr-onboarding-loaders";
import { onboardingListParamsSchema } from "@/lib/validations/onboarding";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ManagerOnboardingListPage({ searchParams }: PageProps) {
  await requireManagerPortal();

  const raw = await searchParams;
  const parsed = onboardingListParamsSchema.parse({
    page: firstString(raw.page),
    pageSize: firstString(raw.pageSize) ?? "20",
    search: firstString(raw.search),
    status: firstString(raw.status),
    designationId: firstString(raw.designationId),
    joiningMonth: firstString(raw.joiningMonth),
    joiningYear: firstString(raw.joiningYear),
  });

  const data = await loadOnboardingModuleData(parsed);
  const joiningYearAnchor = new Date().getFullYear();

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12">
          <LoadingSpinner />
        </div>
      }
    >
      <OnboardingDashboardView
        {...data}
        initialFilters={parsed}
        joiningYearAnchor={joiningYearAnchor}
        basePath={MANAGER_ROUTES.recruitmentOnboarding}
      />
    </Suspense>
  );
}
