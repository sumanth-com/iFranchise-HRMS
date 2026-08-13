import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerTeamLeaveView } from "@/components/manager/leave/manager-team-leave-view";
import { safeServerCall } from "@/lib/errors/safe-server";
import { getMonthDateRange } from "@/lib/leave/services/leave-utils";
import { getManagerTeamLeavePageData } from "@/lib/manager/actions/manager-leave-actions";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { teamLeaveListParamsSchema } from "@/lib/validations/manager-leave";

type ManagerTeamLeavePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ManagerTeamLeavePage({
  searchParams,
}: ManagerTeamLeavePageProps) {
  await requireServerAnyPermission(["portal.manager.access", "leave.view"]);
  const rawParams = await searchParams;
  const now = new Date();
  const rawMonth = Number(firstString(rawParams.month));
  const rawYear = Number(firstString(rawParams.year));
  const month =
    Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12
      ? rawMonth
      : now.getMonth() + 1;
  const year =
    Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100
      ? rawYear
      : now.getFullYear();
  const monthRange = getMonthDateRange(month, year);

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
    dateFrom: firstString(rawParams.dateFrom) ?? monthRange.start,
    dateTo: firstString(rawParams.dateTo) ?? monthRange.end,
  });

  const teamData = await safeServerCall(
    () => getManagerTeamLeavePageData(parsed),
    {
      summary: {
        pendingRequests: 0,
        approvedThisMonth: 0,
        rejectedThisMonth: 0,
        employeesOnLeaveToday: 0,
        upcomingPlannedLeaves: 0,
        leaveConflicts: 0,
        balanceUtilizationPercent: 0,
      },
      records: { data: [], total: 0, page: 1, pageSize: 25 },
      lookups: { leaveTypes: [], departments: [], employees: [] },
      calendar: {
        leaves: [],
        holidays: [],
        month,
        year,
      },
    },
    "[manager/leave/team] team data",
  );

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
        <ManagerTeamLeaveView
          summary={teamData.summary}
          records={teamData.records.data}
          total={teamData.records.total}
          page={teamData.records.page}
          pageSize={teamData.records.pageSize}
          search={parsed.search ?? ""}
          month={month}
          year={year}
          leaveStatus={parsed.leaveStatus}
          leaveTypeId={parsed.leaveTypeId}
          departmentId={parsed.departmentId}
          employeeId={parsed.employeeId}
          leaveTypes={teamData.lookups.leaveTypes}
          departments={teamData.lookups.departments}
          employees={teamData.lookups.employees}
        />
      </div>
    </Suspense>
  );
}
