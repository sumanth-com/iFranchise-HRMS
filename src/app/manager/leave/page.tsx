import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerLeaveView } from "@/components/manager/leave/manager-leave-view";
import { safeServerCall } from "@/lib/errors/safe-server";
import { getManagerTeamLeavePageData } from "@/lib/manager/actions/manager-leave-actions";
import {
  getEmployeeLeaveBalanceSnapshot,
  getEmployeeLeaveCalendarData,
  getLeaveLookups,
  listEmployeeOwnLeaveRequests,
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

  const canApply = hasPermission(profile.permissionCodes, "leave.create");

  const [teamData, balances, requests, calendar, applyLookups] = await Promise.all([
    safeServerCall(
      () => getManagerTeamLeavePageData(parsed),
      {
        summary: {
          pendingRequests: 0,
          approvedThisMonth: 0,
          rejectedThisMonth: 0,
          employeesOnLeaveToday: 0,
          upcomingPlannedLeaves: 0,
          leaveConflicts: 0,
        },
        records: { data: [], total: 0, page: 1, pageSize: 25 },
        lookups: { leaveTypes: [], departments: [], employees: [] },
        calendar: {
          leaves: [],
          holidays: [],
          month: calendarMonth,
          year: calendarYear,
        },
      },
      "[manager/leave] team data",
    ),
    safeServerCall(
      () => getEmployeeLeaveBalanceSnapshot(supabase, employeeId),
      [],
      "[manager/leave] balances",
    ),
    safeServerCall(
      () => listEmployeeOwnLeaveRequests(supabase, employeeId, 1, 25),
      [],
      "[manager/leave] requests",
    ),
    safeServerCall(
      () => getEmployeeLeaveCalendarData(supabase, profile, calendarMonth, calendarYear),
      { leaves: [], holidays: [] },
      "[manager/leave] calendar",
    ),
    canApply
      ? safeServerCall(
          () => getLeaveLookups(supabase, profile.employee.organizationId),
          {
            leaveTypes: [],
            departments: [],
            branches: [],
            employees: [],
            managers: [],
            approvers: [],
            employmentTypes: [],
          },
          "[manager/leave] apply lookups",
        )
      : Promise.resolve(null),
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
          canApply,
          employeeId,
          applyLeaveLookups: applyLookups,
          balances,
          requests,
          calendarMonth,
          calendarYear,
          calendarLeaves: calendar.leaves,
          calendarHolidays: calendar.holidays,
        }}
      />
    </Suspense>
  );
}
