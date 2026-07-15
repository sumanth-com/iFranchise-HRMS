import { Suspense } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CeoAnalyticsView } from "@/components/ceo/analytics/ceo-analytics-view";
import { getCeoAnalyticsModuleData } from "@/lib/ceo/actions/ceo-analytics-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { requireServerPermission } from "@/lib/permissions/server";
import { ceoAnalyticsListParamsSchema } from "@/lib/validations/ceo-analytics";

type CeoAnalyticsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CeoAnalyticsPage({
  searchParams,
}: CeoAnalyticsPageProps) {
  await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const rawParams = await searchParams;
  const today = getTodayDateString();
  const now = new Date(today);

  const parsed = ceoAnalyticsListParamsSchema.parse({
    dateFrom: firstString(rawParams.dateFrom) ?? format(startOfMonth(now), "yyyy-MM-dd"),
    dateTo: firstString(rawParams.dateTo) ?? format(endOfMonth(now), "yyyy-MM-dd"),
    departmentId: firstString(rawParams.departmentId),
    branchId: firstString(rawParams.branchId),
    managerId: firstString(rawParams.managerId),
    employmentTypeId: firstString(rawParams.employmentTypeId),
    compareMode: firstString(rawParams.compareMode),
    compareDepartmentId: firstString(rawParams.compareDepartmentId),
    comparePreviousPeriod: firstString(rawParams.comparePreviousPeriod),
  });

  const data = await getCeoAnalyticsModuleData(parsed);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoAnalyticsView {...data} initialFilters={parsed} />
    </Suspense>
  );
}
