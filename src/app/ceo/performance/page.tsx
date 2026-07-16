import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CeoPerformanceView } from "@/components/ceo/performance/ceo-performance-view";
import { getCeoPerformanceModuleData } from "@/lib/ceo/actions/ceo-performance-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";
import { ceoPerformanceListParamsSchema } from "@/lib/validations/ceo-performance";

type CeoPerformancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CeoPerformancePage({
  searchParams,
}: CeoPerformancePageProps) {
  await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const rawParams = await searchParams;

  const parsed = ceoPerformanceListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize),
    search: firstString(rawParams.search),
    employeeId: firstString(rawParams.employeeId),
    departmentId: firstString(rawParams.departmentId),
    managerId: firstString(rawParams.managerId),
    cycleId: firstString(rawParams.cycleId),
    rating: firstString(rawParams.rating),
    employmentTypeId: firstString(rawParams.employmentTypeId),
  });

  const data = await getCeoPerformanceModuleData(parsed);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoPerformanceView {...data} initialFilters={parsed} />
    </Suspense>
  );
}
