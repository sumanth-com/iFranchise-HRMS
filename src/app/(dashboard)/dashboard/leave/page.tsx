import { Suspense } from "react";

import { HrLeaveHubView } from "@/components/leave/hr-leave-hub-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  getLeaveLookups,
  getLeaveSummary,
  getEmployeeLeaveBalanceSnapshot,
  getEmployeeLeaveCalendarData,
  listLeaveRequests,
} from "@/lib/leave/services/leave-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasAnyPermission, hasPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";
import { leaveListParamsSchema } from "@/lib/validations/leave";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TEAM_LEAVE_PERMISSIONS = [
  "leave.view",
  "leave.approve",
  "leave_balance.view",
] as const;

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function parseSection(value: string | undefined): "my" | "team" {
  return value === "team" ? "team" : "my";
}

export default async function LeaveSelfServicePage({ searchParams }: PageProps) {
  const profile = await requireServerPermission("leave.view");
  const supabase = await createClient();
  const raw = await searchParams;
  const now = new Date();
  const section = parseSection(firstString(raw.tab));
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [
    ...TEAM_LEAVE_PERMISSIONS,
  ]);
  const employeeId = profile.employee.id;
  const calendarMonth = now.getMonth() + 1;
  const calendarYear = now.getFullYear();

  const teamParams = leaveListParamsSchema.parse({
    page: section === "team" ? raw.page : undefined,
    pageSize: raw.pageSize,
    search: firstString(raw.search),
    sortBy: raw.sortBy,
    sortOrder: raw.sortOrder,
    month: raw.month ?? calendarMonth,
    year: raw.year ?? calendarYear,
    leaveStatus: raw.leaveStatus,
    leaveTypeId: raw.leaveTypeId,
    departmentId: raw.departmentId,
    branchId: raw.branchId,
    approverId: raw.approverId,
    reportingManagerId: raw.reportingManagerId,
    employeeId: raw.employeeId,
  });

  const [balances, requests, calendar, teamResult, lookups, summary] = await Promise.all([
    getEmployeeLeaveBalanceSnapshot(supabase, employeeId),
    listLeaveRequests(supabase, profile, { employeeId, page: 1, pageSize: 25 }),
    getEmployeeLeaveCalendarData(supabase, profile, calendarMonth, calendarYear),
    canViewTeam ? listLeaveRequests(supabase, profile, teamParams) : Promise.resolve(null),
    canViewTeam
      ? getLeaveLookups(supabase, profile.employee.organizationId)
      : Promise.resolve(null),
    canViewTeam
      ? getLeaveSummary(supabase, profile, teamParams.month, teamParams.year)
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
      <HrLeaveHubView
        initialSection={section}
        canViewTeam={canViewTeam}
        canApply={hasPermission(profile.permissionCodes, "leave.create")}
        balances={balances}
        requests={requests.data}
        calendarMonth={calendarMonth}
        calendarYear={calendarYear}
        calendarLeaves={calendar.leaves}
        calendarHolidays={calendar.holidays}
        teamLeave={{
          summary: summary ?? {
            pendingRequests: 0,
            approvedThisMonth: 0,
            rejectedThisMonth: 0,
            employeesOnLeaveToday: 0,
            balanceUtilizationPercent: 0,
            upcomingPlannedLeaves: 0,
          },
          records: teamResult?.data ?? [],
          total: teamResult?.total ?? 0,
          page: teamResult?.page ?? teamParams.page,
          pageSize: teamResult?.pageSize ?? teamParams.pageSize,
          search: teamParams.search ?? "",
          month: teamParams.month ?? calendarMonth,
          year: teamParams.year ?? calendarYear,
          leaveStatus: teamParams.leaveStatus,
          leaveTypeId: teamParams.leaveTypeId,
          departmentId: teamParams.departmentId,
          branchId: teamParams.branchId,
          approverId: teamParams.approverId,
          reportingManagerId: teamParams.reportingManagerId,
          employeeId: teamParams.employeeId,
          leaveTypes: lookups?.leaveTypes ?? [],
          departments: lookups?.departments ?? [],
          branches: lookups?.branches ?? [],
          employees: lookups?.employees ?? [],
          approvers: lookups?.approvers ?? [],
          managers: lookups?.managers ?? [],
          canCreate: hasPermission(profile.permissionCodes, "leave.create"),
          canApprove: hasPermission(profile.permissionCodes, "leave.approve"),
          canReject: hasPermission(profile.permissionCodes, "leave.reject"),
          canCancel:
            hasPermission(profile.permissionCodes, "leave.cancel") ||
            hasPermission(profile.permissionCodes, "leave.withdraw"),
        }}
      />
    </Suspense>
  );
}
