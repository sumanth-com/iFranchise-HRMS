import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerReportsView } from "@/components/manager/reports/manager-reports-view";
import { getManagerTeamReportsPageData } from "@/lib/manager/actions/manager-reports-actions";
import { requireServerPermission } from "@/lib/permissions/server";
import { managerReportsListParamsSchema } from "@/lib/validations/manager-reports";

type ManagerReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ManagerReportsPage({ searchParams }: ManagerReportsPageProps) {
  const profile = await requireServerPermission("portal.manager.access");
  const rawParams = await searchParams;

  const parsed = managerReportsListParamsSchema.parse({
    dateFrom: firstString(rawParams.dateFrom),
    dateTo: firstString(rawParams.dateTo),
    departmentId: firstString(rawParams.departmentId),
    designationId: firstString(rawParams.designationId),
    employeeId: firstString(rawParams.employeeId),
    status: firstString(rawParams.status),
    month: firstString(rawParams.month),
    year: firstString(rawParams.year),
    category: firstString(rawParams.category),
  });

  const data = await getManagerTeamReportsPageData(parsed);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ManagerReportsView
        {...data}
        initialFilters={parsed}
        permissionCodes={profile.roles.map((role) => role.code)}
      />
    </Suspense>
  );
}
