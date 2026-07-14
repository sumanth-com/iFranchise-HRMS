import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerPerformanceView } from "@/components/manager/performance/manager-performance-view";
import type { ProfileTab } from "@/components/manager/performance/manager-performance-profile-drawer";
import { getManagerTeamPerformancePageData } from "@/lib/manager/actions/manager-performance-actions";
import { requireServerPermission } from "@/lib/permissions/server";
import { teamPerformanceListParamsSchema } from "@/lib/validations/manager-performance";

type ManagerPerformancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function parseProfileTab(value: string | undefined): ProfileTab | undefined {
  if (value === "feedback" || value === "oneOnOne" || value === "overview" || value === "goals" || value === "review" || value === "recommendations") {
    return value;
  }
  return undefined;
}

export default async function ManagerPerformancePage({
  searchParams,
}: ManagerPerformancePageProps) {
  const profile = await requireServerPermission("portal.manager.access");
  const rawParams = await searchParams;

  const parsed = teamPerformanceListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize),
    search: firstString(rawParams.search),
    sortBy: firstString(rawParams.sortBy),
    sortOrder: firstString(rawParams.sortOrder),
    employeeId: firstString(rawParams.employeeId),
    departmentId: firstString(rawParams.departmentId),
    cycleId: firstString(rawParams.cycleId),
    reviewStatus: firstString(rawParams.reviewStatus),
    minRating: firstString(rawParams.minRating),
  });

  const data = await getManagerTeamPerformancePageData(parsed);
  const employeeId = firstString(rawParams.employeeId);
  const initialTab = parseProfileTab(firstString(rawParams.tab));

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ManagerPerformanceView
        {...data}
        initialFilters={parsed}
        managerEmployeeId={profile.employee.id}
        initialEmployeeId={employeeId}
        initialTab={initialTab}
      />
    </Suspense>
  );
}
