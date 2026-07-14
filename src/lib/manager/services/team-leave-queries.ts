import { format, parseISO } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { ALLOWED_LEAVE_TYPE_CODES } from "@/lib/leave/constants";
import {
  getEmployeeLeaveBalanceSnapshot,
} from "@/lib/leave/services/leave-queries";
import {
  expandDateRange,
  getCurrentBalanceYear,
  getMonthDateRange,
  isWeekendDate,
} from "@/lib/leave/services/leave-utils";
import { getTeamFilterLookups } from "@/lib/manager/services/team-queries";
import { teamLeaveListParamsSchema } from "@/lib/validations/manager-leave";
import type { UserProfile } from "@/types/auth";
import type { LeaveStatus } from "@/types/leave";
import type {
  ManagerLeaveWorkflowStatus,
  ManagerTeamLeavePageData,
  TeamLeaveConflict,
  TeamLeaveListParams,
  TeamLeaveListResult,
  TeamLeaveSummary,
} from "@/types/manager-leave";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

type TeamMemberMeta = {
  id: string;
  departmentId: string | null;
  designationTitle: string | null;
  hasDirectReports: boolean;
};

type OverlappingLeaveRow = {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  leave_status: string;
  employees: {
    first_name: string;
    last_name: string;
    department_id: string | null;
    designations: { title: string } | { title: string }[] | null;
  } | Array<{
    first_name: string;
    last_name: string;
    department_id: string | null;
    designations: { title: string } | { title: string }[] | null;
  }> | null;
};

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseParams(params: TeamLeaveListParams) {
  return teamLeaveListParamsSchema.parse(params);
}

const CRITICAL_ROLE_PATTERN =
  /\b(manager|lead|head|director|supervisor|chief|vp|president)\b/i;

const MIN_DEPARTMENT_STAFFING = 1;

export function resolveManagerLeaveWorkflowStatus(
  leaveStatus: LeaveStatus,
  approvals: Array<{ approvalLevel: number; approvalStatus: string }>,
): ManagerLeaveWorkflowStatus {
  if (leaveStatus === "approved") return "completed";
  if (leaveStatus === "rejected") {
    const managerStep = approvals.find((step) => step.approvalLevel === 1);
    if (managerStep?.approvalStatus === "rejected") return "rejected_by_manager";
    return "rejected_by_manager";
  }

  const managerStep = approvals.find((step) => step.approvalLevel === 1);
  const hrStep = approvals.find((step) => step.approvalLevel === 2);

  if (managerStep?.approvalStatus === "approved") {
    if (hrStep && hrStep.approvalStatus === "pending") return "sent_to_hr";
    return "approved_by_manager";
  }

  return "pending";
}

export async function detectTeamLeaveConflicts(
  supabase: AuthSupabaseClient,
  organizationId: string,
  teamIds: string[],
  input: {
    leaveRequestId?: string;
    employeeId: string;
    departmentId: string | null;
    designationTitle: string | null;
    startDate: string;
    endDate: string;
  },
  teamMeta: TeamMemberMeta[],
  holidays: Array<{ name: string; holidayDate: string }>,
): Promise<TeamLeaveConflict[]> {
  const conflicts: TeamLeaveConflict[] = [];
  const requestDates = expandDateRange(input.startDate, input.endDate);

  for (const date of requestDates) {
    if (isWeekendDate(date)) {
      conflicts.push({
        type: "weekend",
        message: `Leave includes weekend date ${format(parseISO(date), "d MMM yyyy")}.`,
        severity: "info",
      });
      break;
    }
  }

  for (const date of requestDates) {
    const holiday = holidays.find((item) => item.holidayDate === date);
    if (holiday) {
      conflicts.push({
        type: "public_holiday",
        message: `Leave overlaps public holiday "${holiday.name}" on ${format(parseISO(date), "d MMM yyyy")}.`,
        severity: "warning",
      });
    }
  }

  const employeeMeta = teamMeta.find((member) => member.id === input.employeeId);
  const isCriticalRole =
    CRITICAL_ROLE_PATTERN.test(input.designationTitle ?? "") ||
    Boolean(employeeMeta?.hasDirectReports);

  if (isCriticalRole) {
    conflicts.push({
      type: "critical_role",
      message: "This employee holds a critical role in the team hierarchy.",
      severity: "warning",
    });
  }

  if (teamIds.length === 0) return conflicts;

  let overlapQuery = supabase
    .schema("hrms")
    .from("leave_requests")
    .select(
      `
        id,
        employee_id,
        start_date,
        end_date,
        leave_status,
        employees!inner (
          first_name,
          last_name,
          department_id,
          organization_id,
          designations:designation_id (title)
        )
      `,
    )
    .eq("employees.organization_id", organizationId)
    .in("employee_id", teamIds)
    .in("leave_status", ["pending", "approved"])
    .lte("start_date", input.endDate)
    .gte("end_date", input.startDate)
    .is("deleted_at", null);

  if (input.leaveRequestId) {
    overlapQuery = overlapQuery.neq("id", input.leaveRequestId);
  }

  const { data: overlappingLeaves, error } = await overlapQuery;
  if (error) throw new Error(error.message);

  const overlapRows = (overlappingLeaves ?? []) as OverlappingLeaveRow[];
  const overlappingNames = overlapRows
    .filter((row) => row.employee_id !== input.employeeId)
    .map((row) => {
      const employee = unwrap(row.employees);
      return employee ? `${employee.first_name} ${employee.last_name}` : "Team member";
    });

  if (overlappingNames.length > 0) {
    conflicts.push({
      type: "team_overlap",
      message: `Overlapping leave with ${overlappingNames.slice(0, 3).join(", ")}${overlappingNames.length > 3 ? ` and ${overlappingNames.length - 3} more` : ""}.`,
      severity: "warning",
    });
  }

  if (input.departmentId) {
    const departmentMembers = teamMeta.filter(
      (member) => member.departmentId === input.departmentId,
    );
    const departmentSize = departmentMembers.length;

    if (departmentSize > MIN_DEPARTMENT_STAFFING) {
      let maxUnavailable = 0;

      for (const date of requestDates) {
        const unavailable = overlapRows.filter((row) => {
          const employee = unwrap(row.employees);
          if (!employee || employee.department_id !== input.departmentId) return false;
          return row.start_date <= date && row.end_date >= date;
        }).length;

        const includesRequester = departmentMembers.some(
          (member) => member.id === input.employeeId,
        );
        const unavailableCount = unavailable + (includesRequester ? 1 : 0);
        maxUnavailable = Math.max(maxUnavailable, unavailableCount);
      }

      const remaining = departmentSize - maxUnavailable;
      if (remaining < MIN_DEPARTMENT_STAFFING) {
        conflicts.push({
          type: "dept_staffing",
          message: `Department staffing may fall below minimum (${MIN_DEPARTMENT_STAFFING} required). Only ${Math.max(remaining, 0)} member(s) may remain available.`,
          severity: "warning",
        });
      }
    }
  }

  return conflicts;
}

async function loadTeamMemberMeta(
  supabase: AuthSupabaseClient,
  organizationId: string,
  teamIds: string[],
): Promise<TeamMemberMeta[]> {
  if (teamIds.length === 0) return [];

  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        id,
        department_id,
        reporting_manager_id,
        designations:designation_id (title)
      `,
    )
    .eq("organization_id", organizationId)
    .in("id", teamIds)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const managerCounts = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.reporting_manager_id) {
      managerCounts.set(
        row.reporting_manager_id,
        (managerCounts.get(row.reporting_manager_id) ?? 0) + 1,
      );
    }
  }

  return (data ?? []).map((row) => {
    const designation = unwrap(row.designations);
    return {
      id: row.id,
      departmentId: row.department_id,
      designationTitle: designation?.title ?? null,
      hasDirectReports: (managerCounts.get(row.id) ?? 0) > 0,
    };
  });
}

async function loadHolidayDates(
  supabase: AuthSupabaseClient,
  organizationId: string,
  dateFrom: string,
  dateTo: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("holidays")
    .select("name, holiday_date")
    .eq("organization_id", organizationId)
    .gte("holiday_date", dateFrom)
    .lte("holiday_date", dateTo)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    name: row.name,
    holidayDate: row.holiday_date,
  }));
}

export async function listTeamLeaveRequests(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  params: TeamLeaveListParams,
): Promise<TeamLeaveListResult> {
  const parsed = parseParams(params);

  if (teamIds.length === 0) {
    return { data: [], total: 0, page: parsed.page, pageSize: parsed.pageSize };
  }

  const organizationId = profile.employee.organizationId;
  const from = (parsed.page - 1) * parsed.pageSize;
  const to = from + parsed.pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("leave_requests")
    .select(
      `
        id,
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        is_half_day,
        half_day_period,
        reason,
        leave_status,
        created_at,
        employees!inner (
          employee_code,
          first_name,
          last_name,
          department_id,
          branch_id,
          designation_id,
          departments:department_id (name),
          branches:branch_id (name),
          designations:designation_id (title)
        ),
        leave_types:leave_type_id (name, code),
        leave_approvals (
          approval_level,
          approval_status,
          approver_employee_id,
          employees:approver_employee_id (first_name, last_name)
        )
      `,
      { count: "exact" },
    )
    .eq("employees.organization_id", organizationId)
    .in("employee_id", teamIds)
    .is("deleted_at", null);

  if (parsed.dateFrom && parsed.dateTo) {
    query = query.lte("start_date", parsed.dateTo).gte("end_date", parsed.dateFrom);
  }
  if (parsed.leaveStatus) query = query.eq("leave_status", parsed.leaveStatus);
  if (parsed.leaveTypeId) query = query.eq("leave_type_id", parsed.leaveTypeId);
  if (parsed.employeeId) query = query.eq("employee_id", parsed.employeeId);
  if (parsed.departmentId) query = query.eq("employees.department_id", parsed.departmentId);

  if (parsed.search) {
    const term = `%${parsed.search}%`;
    query = query.or(
      `employee_code.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`,
      { referencedTable: "employees" },
    );
  }

  const ascending = parsed.sortOrder === "asc";
  if (parsed.sortBy === "employee_code") {
    query = query.order(parsed.sortBy, { ascending, referencedTable: "employees" });
  } else {
    query = query.order(parsed.sortBy, { ascending });
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];
  const teamMeta = await loadTeamMemberMeta(supabase, organizationId, teamIds);

  const minDate =
    parsed.dateFrom ??
    (rows.reduce(
      (acc, row) => (acc && acc < row.start_date ? acc : row.start_date),
      "",
    ) || getTodayDateString());
  const maxDate =
    parsed.dateTo ??
    (rows.reduce(
      (acc, row) => (acc && acc > row.end_date ? acc : row.end_date),
      "",
    ) || getTodayDateString());
  const holidays = await loadHolidayDates(supabase, organizationId, minDate, maxDate);

  const mapped = await Promise.all(
    rows.map(async (row) => {
      const employee = unwrap(row.employees);
      const leaveType = unwrap(row.leave_types);
      const department = unwrap(employee?.departments ?? null);
      const branch = unwrap(employee?.branches ?? null);
      const designation = unwrap(employee?.designations ?? null);
      const approvals = (row.leave_approvals ?? []) as Array<{
        approval_level: number;
        approval_status: string;
        approver_employee_id: string;
        employees: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
      }>;
      const pendingApproval = approvals
        .filter((step) => step.approval_status === "pending")
        .sort((a, b) => a.approval_level - b.approval_level)[0];
      const currentApprover = pendingApproval
        ? unwrap(pendingApproval.employees)
        : null;

      const conflicts = await detectTeamLeaveConflicts(
        supabase,
        organizationId,
        teamIds,
        {
          leaveRequestId: row.id,
          employeeId: row.employee_id,
          departmentId: employee?.department_id ?? null,
          designationTitle: designation?.title ?? null,
          startDate: row.start_date,
          endDate: row.end_date,
        },
        teamMeta,
        holidays,
      );

      const workflowStatus = resolveManagerLeaveWorkflowStatus(
        row.leave_status as LeaveStatus,
        approvals.map((step) => ({
          approvalLevel: step.approval_level,
          approvalStatus: step.approval_status,
        })),
      );

      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? "",
        employeeName: employee
          ? `${employee.first_name} ${employee.last_name}`
          : "",
        departmentId: employee?.department_id ?? null,
        departmentName: department?.name ?? null,
        branchId: employee?.branch_id ?? null,
        branchName: branch?.name ?? null,
        leaveTypeId: row.leave_type_id,
        leaveTypeName: leaveType?.name ?? "",
        leaveTypeCode: leaveType?.code ?? "",
        startDate: row.start_date,
        endDate: row.end_date,
        totalDays: Number(row.total_days),
        isHalfDay: row.is_half_day,
        halfDayPeriod:
          row.half_day_period === "morning" || row.half_day_period === "afternoon"
            ? row.half_day_period
            : null,
        reason: row.reason,
        leaveStatus: row.leave_status as LeaveStatus,
        appliedAt: row.created_at,
        approverName: currentApprover
          ? `${currentApprover.first_name} ${currentApprover.last_name}`
          : null,
        currentApprovalLevel: pendingApproval?.approval_level ?? null,
        workflowStatus,
        hasConflicts: conflicts.some((item) => item.severity === "warning"),
      };
    }),
  );

  return {
    data: mapped,
    total: count ?? 0,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export async function getTeamLeaveSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
): Promise<TeamLeaveSummary> {
  if (teamIds.length === 0) {
    return {
      pendingRequests: 0,
      approvedThisMonth: 0,
      rejectedThisMonth: 0,
      employeesOnLeaveToday: 0,
      upcomingPlannedLeaves: 0,
      leaveConflicts: 0,
    };
  }

  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const month = Number.parseInt(today.slice(5, 7), 10);
  const year = Number.parseInt(today.slice(0, 4), 10);
  const monthRange = getMonthDateRange(month, year);

  const [
    pendingResult,
    approvedResult,
    rejectedResult,
    onLeaveResult,
    upcomingResult,
    pendingRowsResult,
  ] = await Promise.all([
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .in("employee_id", teamIds)
      .eq("leave_status", "pending")
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .in("employee_id", teamIds)
      .eq("leave_status", "approved")
      .gte("start_date", monthRange.start)
      .lte("start_date", monthRange.end)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .in("employee_id", teamIds)
      .eq("leave_status", "rejected")
      .gte("created_at", `${monthRange.start}T00:00:00`)
      .lte("created_at", `${monthRange.end}T23:59:59`)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select("employee_id", { count: "exact", head: true })
      .in("employee_id", teamIds)
      .eq("leave_status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .in("employee_id", teamIds)
      .eq("leave_status", "approved")
      .gt("start_date", today)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select(
        `
          id,
          employee_id,
          start_date,
          end_date,
          employees!inner (
            department_id,
            designations:designation_id (title)
          )
        `,
      )
      .in("employee_id", teamIds)
      .eq("leave_status", "pending")
      .is("deleted_at", null),
  ]);

  if (pendingResult.error) throw new Error(pendingResult.error.message);
  if (approvedResult.error) throw new Error(approvedResult.error.message);
  if (rejectedResult.error) throw new Error(rejectedResult.error.message);
  if (onLeaveResult.error) throw new Error(onLeaveResult.error.message);
  if (upcomingResult.error) throw new Error(upcomingResult.error.message);
  if (pendingRowsResult.error) throw new Error(pendingRowsResult.error.message);

  const teamMeta = await loadTeamMemberMeta(supabase, organizationId, teamIds);
  const pendingRows = (pendingRowsResult.data ?? []) as LooseRow[];

  let minDate = today;
  let maxDate = today;
  for (const row of pendingRows) {
    if (row.start_date < minDate) minDate = row.start_date;
    if (row.end_date > maxDate) maxDate = row.end_date;
  }

  const holidays = await loadHolidayDates(supabase, organizationId, minDate, maxDate);

  let leaveConflicts = 0;
  for (const row of pendingRows) {
    const employee = unwrap(row.employees);
    const designation = unwrap(employee?.designations ?? null);
    const conflicts = await detectTeamLeaveConflicts(
      supabase,
      organizationId,
      teamIds,
      {
        leaveRequestId: row.id,
        employeeId: row.employee_id,
        departmentId: employee?.department_id ?? null,
        designationTitle: designation?.title ?? null,
        startDate: row.start_date,
        endDate: row.end_date,
      },
      teamMeta,
      holidays,
    );
    if (conflicts.some((item) => item.severity === "warning")) {
      leaveConflicts += 1;
    }
  }

  return {
    pendingRequests: pendingResult.count ?? 0,
    approvedThisMonth: approvedResult.count ?? 0,
    rejectedThisMonth: rejectedResult.count ?? 0,
    employeesOnLeaveToday: onLeaveResult.count ?? 0,
    upcomingPlannedLeaves: upcomingResult.count ?? 0,
    leaveConflicts,
  };
}

export async function getTeamLeaveCalendarData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  month: number,
  year: number,
) {
  if (teamIds.length === 0) {
    return { leaves: [], holidays: [] };
  }

  const organizationId = profile.employee.organizationId;
  const range = getMonthDateRange(month, year);

  const [leavesResult, holidaysResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select(
        `
          id,
          employee_id,
          start_date,
          end_date,
          total_days,
          is_half_day,
          leave_status,
          employees!inner (first_name, last_name, organization_id),
          leave_types:leave_type_id (name)
        `,
      )
      .eq("employees.organization_id", organizationId)
      .in("employee_id", teamIds)
      .in("leave_status", ["approved", "pending", "rejected"])
      .lte("start_date", range.end)
      .gte("end_date", range.start)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("holidays")
      .select("id, name, holiday_date, is_optional")
      .eq("organization_id", organizationId)
      .gte("holiday_date", range.start)
      .lte("holiday_date", range.end)
      .is("deleted_at", null),
  ]);

  if (leavesResult.error) throw new Error(leavesResult.error.message);
  if (holidaysResult.error) throw new Error(holidaysResult.error.message);

  const leaves = (leavesResult.data ?? []).map((row) => {
    const employee = unwrap(row.employees);
    const leaveType = unwrap(row.leave_types);
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: employee
        ? `${employee.first_name} ${employee.last_name}`
        : "",
      leaveTypeName: leaveType?.name ?? "",
      startDate: row.start_date,
      endDate: row.end_date,
      totalDays: Number(row.total_days),
      isHalfDay: row.is_half_day,
      leaveStatus: row.leave_status as TeamLeaveListResult["data"][number]["leaveStatus"],
    };
  });

  const holidays = (holidaysResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    holidayDate: row.holiday_date,
    isOptional: row.is_optional,
  }));

  return { leaves, holidays };
}

export async function getTeamLeaveFilterLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
  teamIds: string[],
) {
  const [teamLookups, leaveTypesResult, employeesResult] = await Promise.all([
    getTeamFilterLookups(supabase, organizationId, teamIds),
    supabase
      .schema("hrms")
      .from("leave_types")
      .select("id, name, code")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .is("deleted_at", null)
      .in("code", [...ALLOWED_LEAVE_TYPE_CODES])
      .order("name"),
    teamIds.length
      ? supabase
          .schema("hrms")
          .from("employees")
          .select("id, first_name, last_name, employee_code")
          .eq("organization_id", organizationId)
          .in("id", teamIds)
          .is("deleted_at", null)
          .order("first_name")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (leaveTypesResult.error) throw new Error(leaveTypesResult.error.message);
  if (employeesResult.error) throw new Error(employeesResult.error.message);

  return {
    leaveTypes: (leaveTypesResult.data ?? []).map((row) => ({
      id: row.id,
      label: row.name,
      code: row.code,
    })),
    departments: teamLookups.departments,
    employees: (employeesResult.data ?? []).map((row) => ({
      id: row.id,
      label: `${row.first_name} ${row.last_name}`.trim(),
      code: row.employee_code,
    })),
  };
}

export async function getManagerTeamLeavePageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  params: TeamLeaveListParams,
): Promise<ManagerTeamLeavePageData> {
  const parsed = parseParams(params);
  const organizationId = profile.employee.organizationId;
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [summary, records, lookups, calendar] = await Promise.all([
    getTeamLeaveSummary(supabase, profile, teamIds),
    listTeamLeaveRequests(supabase, profile, teamIds, parsed),
    getTeamLeaveFilterLookups(supabase, organizationId, teamIds),
    getTeamLeaveCalendarData(supabase, profile, teamIds, month, year),
  ]);

  return {
    summary,
    records,
    lookups,
    calendar: {
      ...calendar,
      month,
      year,
    },
  };
}

export { getEmployeeLeaveBalanceSnapshot, getCurrentBalanceYear };
