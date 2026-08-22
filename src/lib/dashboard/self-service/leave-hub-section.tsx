import { HrLeaveHubView } from "@/components/leave/hr-leave-hub-view";
import { firstHubSearchParam } from "@/lib/dashboard/hub-page-utils";
import {
  getLeaveLookups,
  getLeaveSummary,
  getEmployeeLeaveBalanceSnapshot,
  getEmployeeLeaveCalendarData,
  listEmployeeOwnLeaveRequests,
  listLeaveRequests,
  ensurePendingHrLeaveAssignedToCeo,
} from "@/lib/leave/services/leave-queries";
import { DEFAULT_LEAVE_CALENDAR } from "@/lib/leave/services/leave-calendar-engine";
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
  const leaveStatus = firstString(raw.leaveStatus);
  const summaryFilter = firstString(raw.summaryFilter);
  const isPendingQueue =
    leaveStatus === "pending" || summaryFilter === "pendingRequests";

  const teamParams = leaveListParamsSchema.parse({
    page: section === "team" ? raw.page : undefined,
    pageSize: raw.pageSize,
    search: firstString(raw.search),
    sortBy: raw.sortBy,
    sortOrder: raw.sortOrder,
    // Pending queues must match the dashboard count (all open requests, not this month only).
    month: isPendingQueue ? firstString(raw.month) : (raw.month ?? calendarMonth),
    year: isPendingQueue ? firstString(raw.year) : (raw.year ?? calendarYear),
    leaveStatus,
    leaveTypeId: raw.leaveTypeId,
    departmentId: raw.departmentId,
    branchId: raw.branchId,
    reportingManagerId: raw.reportingManagerId,
    employeeId: raw.employeeId,
    summaryFilter,
    excludeHrApplicants: true,
  });

  const canApply = hasPermission(profile.permissionCodes, "leave.create");
  const canEdit =
    hasPermission(profile.permissionCodes, "leave.edit") ||
    hasPermission(profile.permissionCodes, "leave.create");
  const canDeleteOwn =
    hasPermission(profile.permissionCodes, "leave.delete") ||
    hasPermission(profile.permissionCodes, "leave.cancel") ||
    hasPermission(profile.permissionCodes, "leave.withdraw");

  if (canViewTeam) {
    // Fire-and-forget alongside data loads — do not block the hub on this side-effect.
    void ensurePendingHrLeaveAssignedToCeo(profile.employee.organizationId).catch(
      (error) => {
        console.error(
          "[leave] failed to assign pending HR leave to CEO",
          error instanceof Error ? error.message : error,
        );
      },
    );
  }

  const emptyCalendar = {
    leaves: [] as Awaited<ReturnType<typeof getEmployeeLeaveCalendarData>>["leaves"],
    holidays: [] as Awaited<ReturnType<typeof getEmployeeLeaveCalendarData>>["holidays"],
    calendar: DEFAULT_LEAVE_CALENDAR,
  };

  const loadMySection = section === "my";
  const loadTeamSection = section === "team" && canViewTeam;

  const [
    balancesResult,
    requestsResult,
    calendarResult,
    teamResultSettled,
    teamLookupsSettled,
    summarySettled,
    applyLookupsSettled,
  ] = await Promise.all([
    loadMySection
      ? getEmployeeLeaveBalanceSnapshot(supabase, employeeId, calendarYear).catch((error) => {
          console.error("[leave] balance snapshot failed", error);
          return [] as Awaited<ReturnType<typeof getEmployeeLeaveBalanceSnapshot>>;
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof getEmployeeLeaveBalanceSnapshot>>),
    loadMySection
      ? listEmployeeOwnLeaveRequests(supabase, employeeId, 1, 50, {
          month: calendarMonth,
          year: calendarYear,
        }).catch((error) => {
          console.error("[leave] own requests failed", error);
          return [] as Awaited<ReturnType<typeof listEmployeeOwnLeaveRequests>>;
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof listEmployeeOwnLeaveRequests>>),
    loadMySection
      ? getEmployeeLeaveCalendarData(supabase, profile, calendarMonth, calendarYear).catch(
          (error) => {
            console.error("[leave] calendar failed", error);
            return emptyCalendar;
          },
        )
      : Promise.resolve(emptyCalendar),
    loadTeamSection
      ? listLeaveRequests(supabase, profile, teamParams).catch((error) => {
          console.error("[leave] team requests failed", error);
          return null;
        })
      : Promise.resolve(null),
    loadTeamSection
      ? getLeaveLookups(supabase, profile.employee.organizationId).catch((error) => {
          console.error("[leave] team lookups failed", error);
          return null;
        })
      : Promise.resolve(null),
    loadTeamSection
      ? getLeaveSummary(supabase, profile, teamParams.month, teamParams.year, {
          excludeHrApplicants: true,
        }).catch((error) => {
          console.error("[leave] summary failed", error);
          return null;
        })
      : Promise.resolve(null),
    loadMySection && (canApply || canEdit)
      ? getLeaveLookups(supabase, profile.employee.organizationId).catch((error) => {
          console.error("[leave] apply lookups failed", error);
          return null;
        })
      : Promise.resolve(null),
  ]);

  const balances = balancesResult;
  const requests = requestsResult;
  const calendar = calendarResult;
  const teamResult = teamResultSettled;
  const teamLookups = teamLookupsSettled;
  const summary = summarySettled;
  const applyLookups = applyLookupsSettled;

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
      requests={requests}
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
        summaryFilter: teamParams.summaryFilter,
        leaveTypes: teamLookups?.leaveTypes ?? [],
        departments: teamLookups?.departments ?? [],
        branches: teamLookups?.branches ?? [],
        employees: teamLookups?.employees ?? [],
        managers: teamLookups?.managers ?? [],
        canCreate: hasPermission(profile.permissionCodes, "leave.create"),
        canApprove: true,
        canReject: true,
        canCancel: true,
        canDelete: true,
      }}
      teamApplyLeaveLookups={
        canViewTeam && hasPermission(profile.permissionCodes, "leave.create")
          ? teamLookups
          : null
      }
    />
  );
}
