import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CeoReportsView } from "@/components/ceo/reports/ceo-reports-view";
import { getCeoReportsModuleData } from "@/lib/ceo/actions/ceo-reports-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";
import { ceoReportsListParamsSchema } from "@/lib/validations/ceo-reports";

type CeoReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CeoReportsPage({
  searchParams,
}: CeoReportsPageProps) {
  await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const rawParams = await searchParams;

  const parsed = ceoReportsListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize),
    search: firstString(rawParams.search),
    category: firstString(rawParams.category),
    departmentId: firstString(rawParams.departmentId),
    branchId: firstString(rawParams.branchId),
    dateFrom: firstString(rawParams.dateFrom),
    dateTo: firstString(rawParams.dateTo),
    format: firstString(rawParams.format),
    createdById: firstString(rawParams.createdById),
  });

  const data = await getCeoReportsModuleData(parsed);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoReportsView {...data} initialFilters={parsed} />
    </Suspense>
  );
}
