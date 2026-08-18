import { HrLeaveHubView } from "@/components/leave/hr-leave-hub-view";
import { firstHubSearchParam } from "@/lib/dashboard/hub-page-utils";
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

const TEAM_LEAVE_PERMISSIONS = [
  "leave.view",
  "leave.approve",
  "leave_balance.view",
] as const;

function firstString(value: string | string[] | undefined) {
  return firstHubSearchParam(value);
}

export async function LeaveHubSection({
  section,
  searchParams,
}: {
  section: "my" | "team";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireServerPermission("leave.view");
  const supabase = await createClient();
  const raw = await searchParams;
  const now = new Date();
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [...TEAM_LEAVE_PERMISSIONS]);
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
    reportingManagerId: raw.reportingManagerId,
    employeeId: raw.employeeId,
  });

  const canApply = hasPermission(profile.permissionCodes, "leave.create");
  const canEdit =
    hasPermission(profile.permissionCodes, "leave.edit") ||
    hasPermission(profile.permissionCodes, "leave.create");
  const canDeleteOwn =
    hasPermission(profile.permissionCodes, "leave.delete") ||
    hasPermission(profile.permissionCodes, "leave.cancel") ||
    hasPermission(profile.permissionCodes, "leave.withdraw");

  const [balances, requests, calendar, teamResult, teamLookups, summary, applyLookups] =
    await Promise.all([
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
      canApply || canEdit
        ? getLeaveLookups(supabase, profile.employee.organizationId)
        : Promise.resolve(null),
    ]);

  return (
    <HrLeaveHubView
      initialSection={section}
      canViewTeam={canViewTeam}
      canApply={canApply}
      canEdit={canEdit}
      canDelete={canDeleteOwn}
      employeeId={employeeId}
      applyLeaveLookups={applyLookups}
      balances={balances}
      requests={requests.data}
      calendarMonth={calendarMonth}
      calendarYear={calendarYear}
      calendarLeaves={calendar.leaves}
      calendarHolidays={calendar.holidays}
      calendarContext={calendar.calendar}
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
        reportingManagerId: teamParams.reportingManagerId,
        employeeId: teamParams.employeeId,
        leaveTypes: teamLookups?.leaveTypes ?? [],
        departments: teamLookups?.departments ?? [],
        branches: teamLookups?.branches ?? [],
        employees: teamLookups?.employees ?? [],
        managers: teamLookups?.managers ?? [],
        canCreate: hasPermission(profile.permissionCodes, "leave.create"),
        canApprove: hasPermission(profile.permissionCodes, "leave.approve"),
        canReject: hasPermission(profile.permissionCodes, "leave.reject"),
        canCancel:
          hasPermission(profile.permissionCodes, "leave.cancel") ||
          hasPermission(profile.permissionCodes, "leave.withdraw"),
        canDelete:
          hasPermission(profile.permissionCodes, "leave.delete") ||
          hasPermission(profile.permissionCodes, "leave.cancel"),
      }}
      teamApplyLeaveLookups={
        canViewTeam && hasPermission(profile.permissionCodes, "leave.create")
          ? teamLookups
          : null
      }
    />
  );
}
