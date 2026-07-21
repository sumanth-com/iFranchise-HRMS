import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerLeaveView } from "@/components/manager/leave/manager-leave-view";
import { getManagerTeamLeavePageData } from "@/lib/manager/actions/manager-leave-actions";
import {
  getEmployeeLeaveBalanceSnapshot,
  getEmployeeLeaveCalendarData,
  listLeaveRequests,
} from "@/lib/leave/services/leave-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";
import { teamLeaveListParamsSchema } from "@/lib/validations/manager-leave";

type ManagerLeavePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function parseSection(value: string | undefined): "my" | "team" {
  return value === "team" ? "team" : "my";
}

export default async function ManagerLeavePage({
  searchParams,
}: ManagerLeavePageProps) {
  const profile = await requireServerAnyPermission([
    "portal.manager.access",
    "leave.view",
  ]);
  const supabase = await createClient();
  const rawParams = await searchParams;
  const leaveId = firstString(rawParams.leaveId);
  const section = leaveId ? "team" : parseSection(firstString(rawParams.tab));

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

  const employeeId = profile.employee.id;
  const now = new Date();
  const calendarMonth = now.getMonth() + 1;
  const calendarYear = now.getFullYear();

  const [teamData, balances, requests, calendar] = await Promise.all([
    getManagerTeamLeavePageData(parsed),
    getEmployeeLeaveBalanceSnapshot(supabase, employeeId),
    listLeaveRequests(supabase, profile, { employeeId, page: 1, pageSize: 25 }),
    getEmployeeLeaveCalendarData(supabase, profile, calendarMonth, calendarYear),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ManagerLeaveView
        {...teamData}
        initialFilters={parsed}
        initialLeaveId={leaveId}
        initialSection={section}
        selfLeave={{
          canApply: hasPermission(profile.permissionCodes, "leave.create"),
          balances,
          requests: requests.data,
          calendarMonth,
          calendarYear,
          calendarLeaves: calendar.leaves,
          calendarHolidays: calendar.holidays,
        }}
      />
    </Suspense>
  );
}
