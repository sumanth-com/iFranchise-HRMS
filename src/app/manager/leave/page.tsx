import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerLeaveView } from "@/components/manager/leave/manager-leave-view";
import { getManagerTeamLeavePageData } from "@/lib/manager/actions/manager-leave-actions";
import { requireServerPermission } from "@/lib/permissions/server";
import { teamLeaveListParamsSchema } from "@/lib/validations/manager-leave";

type ManagerLeavePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ManagerLeavePage({
  searchParams,
}: ManagerLeavePageProps) {
  await requireServerPermission("portal.manager.access");
  const rawParams = await searchParams;

  const parsed = teamLeaveListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize),
    search: firstString(rawParams.search),
    sortBy: firstString(rawParams.sortBy),
    sortOrder: firstString(rawParams.sortOrder),
    leaveStatus: firstString(rawParams.leaveStatus),
    leaveTypeId: firstString(rawParams.leaveTypeId),
    departmentId: firstString(rawParams.departmentId),
    employeeId: firstString(rawParams.employeeId),
    dateFrom: firstString(rawParams.dateFrom),
    dateTo: firstString(rawParams.dateTo),
  });

  const data = await getManagerTeamLeavePageData(parsed);
  const leaveId = firstString(rawParams.leaveId);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ManagerLeaveView
        {...data}
        initialFilters={parsed}
        initialLeaveId={leaveId}
      />
    </Suspense>
  );
}
