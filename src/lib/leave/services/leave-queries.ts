import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { hasPermission } from "@/lib/permissions/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/auth";
import type { LookupOption } from "@/types/employee";
import type {
  LeaveBalanceItem,
  LeaveCalendarEntry,
  LeaveEmployeeBalanceSnapshot,
  LeaveHolidayEntry,
  LeaveListItem,
  LeaveListParams,
  LeaveListResult,
  LeaveLookups,
  LeaveSortField,
  LeaveSummary,
} from "@/types/leave";
import { leaveListParamsSchema } from "@/lib/validations/leave";
import { formatCleanEmployeeName } from "@/lib/employees/parse-employee-name";
import {
  ALLOWED_LEAVE_TYPE_CODES,
  LEAVE_BALANCE_DISPLAY_CODES,
  LEAVE_BALANCE_DISPLAY_LABELS,
  sortByLeaveTypeCode,
} from "@/lib/leave/constants";
import { loadLeavePolicyRuntime } from "@/lib/leave/services/leave-policy-runtime";
import {
  DEFAULT_LEAVE_CALENDAR,
  type LeaveCalendarContext,
} from "@/lib/leave/services/leave-calendar-engine";
import {
  countLeaveDaysInRange,
  roundLeaveDays,
} from "@/lib/leave/services/leave-usage";
import {
  getBranches,
  getDepartments,
  getEmploymentTypes,
} from "@/lib/employees/services/employee-queries";
import {
  resolveOrgDataEmployeeScope,
  scopedEmployeeIds,
} from "@/lib/manager/portal-scope";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import {
  HR_LEAVE_APPLICANT_ROLE_CODES,
  isHrLeaveApplicant,
} from "@/lib/leave/leave-applicant-roles";
import {
  getCurrentBalanceYear,
  getMonthDateRange,
  sortLeaveListItemsForDisplay,
} from "@/lib/leave/services/leave-utils";

type LeaveRequestRow = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number | string;
  is_half_day: boolean;
  half_day_period: string | null;
  reason: string | null;
  leave_status: string;
  created_at: string;
  employees: {
    employee_code: string;
    first_name: string;
    last_name: string;
    department_id: string | null;
    designation_id: string | null;
    branch_id: string;
    departments: { name: string } | { name: string }[] | null;
    designations: { title: string } | { title: string }[] | null;
    branches: { name: string } | { name: string }[] | null;
  } | {
    employee_code: string;
    first_name: string;
    last_name: string;
    department_id: string | null;
    designation_id: string | null;
    branch_id: string;
    departments: { name: string } | { name: string }[] | null;
    designations: { title: string } | { title: string }[] | null;
    branches: { name: string } | { name: string }[] | null;
  }[] | null;
  leave_types: { name: string; code: string } | { name: string; code: string }[] | null;
  leave_approvals: Array<{
    approval_level: number;
    approval_status: string;
    approver_employee_id: string;
    employees: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  }> | null;
};

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function approvalPersonName(
  approval: {
    approver_employee_id: string;
    employees: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  },
  nameById: Map<string, string>,
): string | null {
  const fromJoin = unwrapRelation(approval.employees);
  if (fromJoin) {
    const name = `${fromJoin.first_name} ${fromJoin.last_name}`.trim();
    if (name) return name;
  }
  return nameById.get(approval.approver_employee_id) ?? null;
}

function resolveApproverDisplayName(
  approvals: NonNullable<LeaveRequestRow["leave_approvals"]>,
  nameById: Map<string, string>,
): string | null {
  const pending = [...approvals]
    .filter((a) => a.approval_status === "pending")
    .sort((a, b) => a.approval_level - b.approval_level)[0];
  if (pending) return approvalPersonName(pending, nameById);

  const acted = [...approvals]
    .filter((a) => a.approval_status === "approved" || a.approval_status === "rejected")
    .sort((a, b) => b.approval_level - a.approval_level)[0];
  if (acted) return approvalPersonName(acted, nameById);

  const first = [...approvals].sort((a, b) => a.approval_level - b.approval_level)[0];
  return first ? approvalPersonName(first, nameById) : null;
}

function parseListParams(params: LeaveListParams) {
  return leaveListParamsSchema.parse(params);
}

export async function listLeaveRequests(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: LeaveListParams,
): Promise<LeaveListResult> {
  const {
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    month,
    year,
    leaveStatus,
    leaveTypeId,
    departmentId,
    branchId,
    approverId,
    employmentTypeId,
    reportingManagerId,
    employeeId,
    employmentStatus,
    isHalfDay,
    dateFrom,
    dateTo,
    createdByEmployeeId,
    excludeHrApplicants,
    summaryFilter,
  } = parseListParams(params);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  const employeeScope = await resolveOrgDataEmployeeScope(supabase, profile);
  const scopedIds = scopedEmployeeIds(
    employeeScope,
    employeeId ?? createdByEmployeeId,
  );
  if (scopedIds && scopedIds.length === 0) {
    return { data: [], total: 0, page, pageSize };
  }

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
          designation_id,
          branch_id,
          departments:department_id (name),
          designations:designation_id (title),
          branches:branch_id (name)
        ),
        leave_types:leave_type_id (name, code)
      `,
      { count: "estimated" },
    )
    .eq("employees.organization_id", organizationId)
    .is("deleted_at", null);

  if (scopedIds) {
    query = query.in("employee_id", scopedIds);
  }

  if (excludeHrApplicants) {
    const hrApplicantIds = await listHrLeaveApplicantEmployeeIds(organizationId);
    if (hrApplicantIds.length > 0) {
      query = query.not("employee_id", "in", `(${hrApplicantIds.join(",")})`);
    }
  }

  // Approver filter: resolve matching leave_request ids first (bounded), avoid
  // forcing a nested leave_approvals embed on the paged list query.
  if (approverId) {
    const { data: approvalScope, error: approvalScopeError } = await supabase
      .schema("hrms")
      .from("leave_approvals")
      .select("leave_request_id")
      .eq("approver_employee_id", approverId)
      .is("deleted_at", null)
      .limit(2000);
    if (approvalScopeError) throw new Error(approvalScopeError.message);
    const scopedLeaveIds = [
      ...new Set(
        (approvalScope ?? [])
          .map((row) => row.leave_request_id as string)
          .filter(Boolean),
      ),
    ];
    if (scopedLeaveIds.length === 0) {
      return { data: [], total: 0, page, pageSize };
    }
    query = query.in("id", scopedLeaveIds);
  }

  const today = getTodayDateString();
  const isPendingQueue =
    summaryFilter === "pendingRequests" || leaveStatus === "pending";

  if (summaryFilter === "pendingRequests") {
    query = query.eq("leave_status", "pending");
  } else if (summaryFilter === "approvedThisMonth") {
    const range = getMonthDateRange(month ?? Number.parseInt(today.slice(5, 7), 10), year ?? Number.parseInt(today.slice(0, 4), 10));
    query = query
      .eq("leave_status", "approved")
      .gte("start_date", range.start)
      .lte("start_date", range.end);
  } else if (summaryFilter === "rejectedThisMonth") {
    const range = getMonthDateRange(month ?? Number.parseInt(today.slice(5, 7), 10), year ?? Number.parseInt(today.slice(0, 4), 10));
    query = query
      .eq("leave_status", "rejected")
      .gte("created_at", `${range.start}T00:00:00`)
      .lte("created_at", `${range.end}T23:59:59`);
  } else if (summaryFilter === "employeesOnLeaveToday") {
    query = query
      .eq("leave_status", "approved")
      .lte("start_date", today)
      .gte("end_date", today);
  } else if (summaryFilter === "upcomingPlannedLeaves") {
    // Applied upcoming leave: pending or approved requests that start after today.
    query = query.in("leave_status", ["pending", "approved"]).gt("start_date", today);
  } else if (dateFrom && dateTo) {
    query = query.lte("start_date", dateTo).gte("end_date", dateFrom);
  } else if (!isPendingQueue && month && year) {
    // Pending approval queues are org-wide — do not clip them to the calendar month.
    const range = getMonthDateRange(month, year);
    query = query
      .gte("start_date", range.start)
      .lte("end_date", range.end);
  } else if (!isPendingQueue && year) {
    query = query
      .gte("start_date", `${year}-01-01`)
      .lte("end_date", `${year}-12-31`);
  }

  if (!summaryFilter && leaveStatus) query = query.eq("leave_status", leaveStatus);
  if (leaveTypeId) query = query.eq("leave_type_id", leaveTypeId);
  if (!scopedIds && employeeId) query = query.eq("employee_id", employeeId);
  if (!scopedIds && createdByEmployeeId) query = query.eq("employee_id", createdByEmployeeId);
  if (departmentId) query = query.eq("employees.department_id", departmentId);
  if (branchId) query = query.eq("employees.branch_id", branchId);
  if (employmentStatus) {
    query = query.eq("employees.employment_status", employmentStatus);
  }
  if (employmentTypeId) {
    query = query.eq("employees.employment_type_id", employmentTypeId);
  }
  if (reportingManagerId) {
    query = query.eq("employees.reporting_manager_id", reportingManagerId);
  }
  if (typeof isHalfDay === "boolean") {
    query = query.eq("is_half_day", isHalfDay);
  }

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `employee_code.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`,
      { referencedTable: "employees" },
    );
  }

  const ascending = sortOrder === "asc";
  const employeeSortFields: LeaveSortField[] = ["employee_code"];

  if (employeeSortFields.includes(sortBy)) {
    query = query.order(sortBy, { ascending, referencedTable: "employees" });
  } else {
    query = query.order(sortBy, { ascending });
  }

  query = query.order("created_at", { ascending: false });
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LeaveRequestRow[];
  const leaveIds = rows.map((row) => row.id);

  // Approvals only for the visible page of requests (not nested on the list join).
  const approvalsByLeaveId = new Map<
    string,
    NonNullable<LeaveRequestRow["leave_approvals"]>
  >();
  if (leaveIds.length > 0) {
    const { data: approvalRows, error: approvalsError } = await supabase
      .schema("hrms")
      .from("leave_approvals")
      .select(
        `
          leave_request_id,
          approval_level,
          approval_status,
          approver_employee_id,
          employees:approver_employee_id (first_name, last_name)
        `,
      )
      .in("leave_request_id", leaveIds)
      .is("deleted_at", null);
    if (approvalsError) throw new Error(approvalsError.message);

    for (const row of approvalRows ?? []) {
      const leaveRequestId = row.leave_request_id as string;
      const list = approvalsByLeaveId.get(leaveRequestId) ?? [];
      list.push({
        approval_level: Number(row.approval_level),
        approval_status: String(row.approval_status),
        approver_employee_id: String(row.approver_employee_id),
        employees: (row.employees ?? null) as NonNullable<
          LeaveRequestRow["leave_approvals"]
        >[number]["employees"],
      });
      approvalsByLeaveId.set(leaveRequestId, list);
    }
  }

  const mapped = rows.map((row) => {
      const employee = unwrapRelation(row.employees);
      const leaveType = unwrapRelation(row.leave_types);
      const department = unwrapRelation(employee?.departments ?? null);
      const designation = unwrapRelation(employee?.designations ?? null);
      const branch = unwrapRelation(employee?.branches ?? null);
      const approvals = approvalsByLeaveId.get(row.id) ?? [];
      const pendingApproval = approvals
        .filter((a) => a.approval_status === "pending")
        .sort((a, b) => a.approval_level - b.approval_level)[0];

      const pendingApproverEmployeeId = pendingApproval?.approver_employee_id ?? null;
      const isAssignedApprover =
        pendingApproverEmployeeId === profile.employee.id &&
        row.leave_status === "pending";

      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? "",
        employeeName: employee
          ? formatCleanEmployeeName(employee.first_name, employee.last_name)
          : "",
        departmentId: employee?.department_id ?? null,
        departmentName: department?.name ?? null,
        designationId: employee?.designation_id ?? null,
        designationName: designation?.title ?? null,
        branchId: employee?.branch_id ?? null,
        branchName: branch?.name ?? null,
        leaveTypeId: row.leave_type_id,
        leaveTypeName: leaveType?.name ?? "",
        leaveTypeCode: leaveType?.code ?? "",
        startDate: row.start_date,
        endDate: row.end_date,
        totalDays: Number(row.total_days),
        isHalfDay: row.is_half_day,
        halfDayPeriod: ((): LeaveListResult["data"][number]["halfDayPeriod"] => {
          if (row.half_day_period === "morning" || row.half_day_period === "afternoon") {
            return row.half_day_period;
          }
          return null;
        })(),
        reason: row.reason,
        leaveStatus: row.leave_status as LeaveListResult["data"][number]["leaveStatus"],
        appliedAt: row.created_at,
        approverName: resolveApproverDisplayName(approvals, new Map()),
        currentApprovalLevel: pendingApproval?.approval_level ?? null,
        pendingApproverEmployeeId,
        canActOnApproval: isAssignedApprover,
        canActOnRejection: isAssignedApprover,
      };
    });

  const prioritizePendingAndLatest =
    summaryFilter === "upcomingPlannedLeaves" ||
    (sortBy === "created_at" && sortOrder === "desc");

  return {
    data: prioritizePendingAndLatest
      ? sortLeaveListItemsForDisplay(mapped)
      : mapped,
    total: count ?? 0,
    page,
    pageSize,
  };
}

/** Employee self-service list — avoids heavy HR joins that can fail under RLS. */
export async function listEmployeeOwnLeaveRequests(
  supabase: AuthSupabaseClient,
  employeeId: string,
  page = 1,
  pageSize = 25,
  monthYear?: { month: number; year: number },
): Promise<LeaveListItem[]> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

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
        duration_breakdown,
        leave_types:leave_type_id (name, code)
      `,
    )
    .eq("employee_id", employeeId)
    .is("deleted_at", null);

  if (monthYear) {
    const range = getMonthDateRange(monthYear.month, monthYear.year);
    query = query.lte("start_date", range.end).gte("end_date", range.start);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const leaveType = unwrapRelation(
      row.leave_types as { name: string; code: string } | { name: string; code: string }[] | null,
    );

    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeCode: "",
      employeeName: "",
      departmentId: null,
      departmentName: null,
      branchId: null,
      branchName: null,
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
      leaveStatus: row.leave_status as LeaveListItem["leaveStatus"],
      appliedAt: row.created_at,
      durationBreakdown: row.duration_breakdown ?? undefined,
      approverName: null,
      currentApprovalLevel: null,
    };
  });
}

export async function getLeaveSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  month?: number,
  year?: number,
  options?: { excludeHrApplicants?: boolean; skipBalanceUtilization?: boolean },
): Promise<LeaveSummary> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const summaryYear = year ?? Number.parseInt(today.slice(0, 4), 10);
  const summaryMonth = month ?? Number.parseInt(today.slice(5, 7), 10);
  const monthRange = getMonthDateRange(summaryMonth, summaryYear);
  const hrApplicantIds = options?.excludeHrApplicants
    ? await listHrLeaveApplicantEmployeeIds(organizationId)
    : [];

  const applyHrExclusion = <T extends { not: (column: string, operator: string, value: string) => T }>(
    query: T,
  ): T => {
    if (hrApplicantIds.length === 0) return query;
    return query.not("employee_id", "in", `(${hrApplicantIds.join(",")})`);
  };

  const balanceYear = getCurrentBalanceYear(today);

  const [pendingResult, approvedResult, rejectedResult, onLeaveResult, upcomingResult, balanceUtilizationPercent] =
    await Promise.all([
    applyHrExclusion(
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select("id, employees!inner(organization_id)", { count: "exact", head: true })
        .eq("leave_status", "pending")
        .eq("employees.organization_id", organizationId)
        .is("deleted_at", null),
    ),
    applyHrExclusion(
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select("id, employees!inner(organization_id)", { count: "exact", head: true })
        .eq("leave_status", "approved")
        .gte("start_date", monthRange.start)
        .lte("start_date", monthRange.end)
        .eq("employees.organization_id", organizationId)
        .is("deleted_at", null),
    ),
    applyHrExclusion(
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select("id, employees!inner(organization_id)", { count: "exact", head: true })
        .eq("leave_status", "rejected")
        .gte("created_at", `${monthRange.start}T00:00:00`)
        .lte("created_at", `${monthRange.end}T23:59:59`)
        .eq("employees.organization_id", organizationId)
        .is("deleted_at", null),
    ),
    applyHrExclusion(
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select("employee_id, employees!inner(organization_id)", { count: "exact", head: true })
        .eq("leave_status", "approved")
        .lte("start_date", today)
        .gte("end_date", today)
        .eq("employees.organization_id", organizationId)
        .is("deleted_at", null),
    ),
    applyHrExclusion(
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select("id, employees!inner(organization_id)", { count: "exact", head: true })
        .in("leave_status", ["pending", "approved"])
        .gt("start_date", today)
        .eq("employees.organization_id", organizationId)
        .is("deleted_at", null),
    ),
    options?.skipBalanceUtilization
      ? Promise.resolve(0)
      : computeOrgLeaveBalanceUtilizationPercent(supabase, organizationId, balanceYear),
  ]);

  return {
    pendingRequests: pendingResult.count ?? 0,
    approvedThisMonth: approvedResult.count ?? 0,
    rejectedThisMonth: rejectedResult.count ?? 0,
    employeesOnLeaveToday: onLeaveResult.count ?? 0,
    balanceUtilizationPercent,
    upcomingPlannedLeaves: upcomingResult.count ?? 0,
  };
}

function sumBalanceDays(
  rows: Array<{ allocated_days?: number | null; used_days?: number | null }> | null | undefined,
): { allocated: number; used: number } {
  let allocated = 0;
  let used = 0;
  for (const row of rows ?? []) {
    allocated += Number(row.allocated_days ?? 0);
    used += Number(row.used_days ?? 0);
  }
  return { allocated, used };
}

/**
 * Org-wide leave utilization.
 * Hosted Supabase often disables PostgREST aggregates ("Use of aggregate functions
 * is not allowed"), so we select only allocated/used columns and sum in memory.
 */
async function computeOrgLeaveBalanceUtilizationPercent(
  supabase: AuthSupabaseClient,
  organizationId: string,
  balanceYear: number,
): Promise<number> {
  const joined = await supabase
    .schema("hrms")
    .from("leave_balances")
    .select("allocated_days, used_days, employees!inner(organization_id)")
    .eq("balance_year", balanceYear)
    .eq("employees.organization_id", organizationId)
    .is("deleted_at", null);

  if (!joined.error) {
    const { allocated, used } = sumBalanceDays(
      (joined.data ?? []) as Array<{ allocated_days?: number | null; used_days?: number | null }>,
    );
    if (allocated > 0) return Math.round((used / allocated) * 100);
    return 0;
  }

  const { data: employeeRows, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (employeeError) {
    console.error(
      "[leave] balance utilization employee scope failed",
      employeeError.message,
      "join:",
      joined.error.message,
    );
    return 0;
  }

  const employeeIds = (employeeRows ?? []).map((row) => row.id as string);
  if (employeeIds.length === 0) return 0;

  let allocatedTotal = 0;
  let usedTotal = 0;
  const chunkSize = 500;

  for (let index = 0; index < employeeIds.length; index += chunkSize) {
    const chunk = employeeIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .schema("hrms")
      .from("leave_balances")
      .select("allocated_days, used_days")
      .in("employee_id", chunk)
      .eq("balance_year", balanceYear)
      .is("deleted_at", null);

    if (error) {
      console.error("[leave] balance utilization chunk select failed", error.message);
      return 0;
    }

    const { allocated, used } = sumBalanceDays(data);
    allocatedTotal += allocated;
    usedTotal += used;
  }

  if (allocatedTotal <= 0) return 0;
  return Math.round((usedTotal / allocatedTotal) * 100);
}

export async function getEmployeeLeaveBalanceSnapshot(
  supabase: AuthSupabaseClient,
  employeeId: string,
  balanceYearParam = getCurrentBalanceYear(),
  monthYear?: { month: number; year: number },
): Promise<LeaveEmployeeBalanceSnapshot[]> {
  const now = new Date();
  const calendarYear = monthYear?.year ?? balanceYearParam;
  const balanceYear = balanceYearParam;
  const month = monthYear?.month ?? now.getMonth() + 1;
  const monthRange = getMonthDateRange(month, calendarYear);
  const yearRange = { start: `${calendarYear}-01-01`, end: `${calendarYear}-12-31` };

  const [employeeResult, balancesResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("employees")
      .select("organization_id")
      .eq("id", employeeId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .schema("hrms")
      .from("leave_balances")
      .select(
        "allocated_days, used_days, pending_days, balance_days, leave_types:leave_type_id (name, code, days_per_year)",
      )
      .eq("employee_id", employeeId)
      .eq("balance_year", balanceYear)
      .is("deleted_at", null),
  ]);

  if (employeeResult.error) throw new Error(employeeResult.error.message);
  if (balancesResult.error) throw new Error(balancesResult.error.message);

  const organizationId = employeeResult.data?.organization_id as string | undefined;
  let typeRows: Array<{ code: string; name: string; days_per_year: number | string | null }> = [];
  let requestRows: Array<{
    start_date: string;
    end_date: string;
    is_half_day: boolean;
    leave_status: string;
    duration_breakdown: unknown;
    leave_types: { code: string } | { code: string }[] | null;
  }> = [];
  let calendar = DEFAULT_LEAVE_CALENDAR;

  if (organizationId) {
    const [typesResult, requestsResult, runtime] = await Promise.all([
      supabase
        .schema("hrms")
        .from("leave_types")
        .select("code, name, days_per_year")
        .eq("organization_id", organizationId)
        .in("code", [...LEAVE_BALANCE_DISPLAY_CODES])
        .is("deleted_at", null),
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select(
          `start_date, end_date, is_half_day, leave_status, duration_breakdown,
           leave_types:leave_type_id (code)`,
        )
        .eq("employee_id", employeeId)
        .in("leave_status", ["approved", "pending"])
        .lte("start_date", yearRange.end)
        .gte("end_date", yearRange.start)
        .is("deleted_at", null),
      loadLeavePolicyRuntime(supabase, organizationId),
    ]);

    if (typesResult.error) throw new Error(typesResult.error.message);
    if (requestsResult.error) throw new Error(requestsResult.error.message);

    typeRows = typesResult.data ?? [];
    requestRows = (requestsResult.data ?? []) as typeof requestRows;
    calendar = runtime.calendar;
  }
  const monthUsedByCode: Record<string, number> = {};
  const yearUsedByCode: Record<string, number> = {};
  const yearTakenByCode: Record<string, number> = {};

  for (const row of requestRows) {
    const leaveType = unwrapRelation(
      row.leave_types as { code: string } | { code: string }[] | null,
    );
    const code = leaveType?.code;
    if (!code) continue;

    const request = {
      startDate: row.start_date,
      endDate: row.end_date,
      isHalfDay: Boolean(row.is_half_day),
      durationBreakdown: row.duration_breakdown,
    };
    const takenInYear = countLeaveDaysInRange(request, yearRange, calendar);
    monthUsedByCode[code] =
      (monthUsedByCode[code] ?? 0) + countLeaveDaysInRange(request, monthRange, calendar);
    yearTakenByCode[code] = (yearTakenByCode[code] ?? 0) + takenInYear;
    if (row.leave_status === "approved") {
      yearUsedByCode[code] = (yearUsedByCode[code] ?? 0) + takenInYear;
    }
  }

  const balanceByCode = new Map<
    string,
    {
      leaveTypeName: string;
      allocatedDays: number;
      usedDays: number;
      pendingDays: number;
      balanceDays: number;
      daysPerYear: number;
    }
  >();

  for (const row of balancesResult.data ?? []) {
    const leaveType = unwrapRelation(
      row.leave_types as
        | { name: string; code: string; days_per_year?: number | string }
        | { name: string; code: string; days_per_year?: number | string }[]
        | null,
    );
    const code = leaveType?.code ?? "";
    if (!code) continue;
    balanceByCode.set(code, {
      leaveTypeName: leaveType?.name ?? LEAVE_BALANCE_DISPLAY_LABELS[code as keyof typeof LEAVE_BALANCE_DISPLAY_LABELS] ?? "Leave",
      allocatedDays: Number(row.allocated_days),
      usedDays: Number(row.used_days),
      pendingDays: Number(row.pending_days),
      balanceDays: Number(row.balance_days),
      daysPerYear: Number(leaveType?.days_per_year ?? 0),
    });
  }

  const typeByCode = new Map(
    typeRows.map((row) => [
      row.code,
      { name: row.name, daysPerYear: Number(row.days_per_year ?? 0) },
    ]),
  );

  return LEAVE_BALANCE_DISPLAY_CODES.map((code) => {
    const balance = balanceByCode.get(code);
    const type = typeByCode.get(code);
    const daysPerYear = balance?.daysPerYear || type?.daysPerYear || 0;
    const allocatedDays = Math.max(balance?.allocatedDays || 0, daysPerYear);
    const usedFromRequests = yearUsedByCode[code] ?? 0;
    const usedDays = Math.max(balance?.usedDays ?? 0, usedFromRequests);
    const pendingDays = balance?.pendingDays ?? 0;
    const balanceDays =
      balance?.balanceDays ?? Math.max(0, roundLeaveDays(allocatedDays - usedDays - pendingDays));

    return {
      leaveTypeCode: code,
      leaveTypeName:
        balance?.leaveTypeName || type?.name || LEAVE_BALANCE_DISPLAY_LABELS[code],
      allocatedDays,
      usedDays: roundLeaveDays(usedDays),
      pendingDays: roundLeaveDays(pendingDays),
      balanceDays: roundLeaveDays(balanceDays),
      monthUsedDays: roundLeaveDays(monthUsedByCode[code] ?? 0),
      monthTotalDays: roundLeaveDays(allocatedDays),
      yearTakenDays: roundLeaveDays(yearTakenByCode[code] ?? 0),
    };
  });
}

export async function listLeaveBalances(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  balanceYear = getCurrentBalanceYear(),
): Promise<LeaveBalanceItem[]> {
  const organizationId = profile.employee.organizationId;

  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_balances")
    .select(
      `
        id,
        employee_id,
        leave_type_id,
        balance_year,
        allocated_days,
        used_days,
        pending_days,
        balance_days,
        employees!inner (
          employee_code,
          first_name,
          last_name,
          organization_id,
          departments:department_id (name)
        ),
        leave_types:leave_type_id (name, code)
      `,
    )
    .eq("employees.organization_id", organizationId)
    .eq("balance_year", balanceYear)
    .is("deleted_at", null)
    .order("employee_id", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const employee = unwrapRelation(row.employees);
      const leaveType = unwrapRelation(row.leave_types);
      const department = unwrapRelation(employee?.departments ?? null);

      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? "",
        employeeName: employee
          ? formatCleanEmployeeName(employee.first_name, employee.last_name)
          : "",
        departmentName: department?.name ?? null,
        leaveTypeId: row.leave_type_id,
        leaveTypeName: leaveType?.name ?? "",
        leaveTypeCode: leaveType?.code ?? "",
        balanceYear: row.balance_year,
        allocatedDays: Number(row.allocated_days),
        usedDays: Number(row.used_days),
        pendingDays: Number(row.pending_days),
        balanceDays: Number(row.balance_days),
      };
    })
    .filter((row) =>
      LEAVE_BALANCE_DISPLAY_CODES.includes(
        row.leaveTypeCode as (typeof LEAVE_BALANCE_DISPLAY_CODES)[number],
      ),
    );
}

export async function getLeaveCalendarData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  month: number,
  year: number,
): Promise<{
  leaves: LeaveCalendarEntry[];
  holidays: LeaveHolidayEntry[];
  calendar: LeaveCalendarContext;
}> {
  const organizationId = profile.employee.organizationId;
  const range = getMonthDateRange(month, year);

  const [leavesResult, holidaysResult, runtime] = await Promise.all([
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
      .in("leave_status", ["approved", "pending"])
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
    loadLeavePolicyRuntime(supabase, organizationId),
  ]);

  if (leavesResult.error) throw new Error(leavesResult.error.message);
  if (holidaysResult.error) throw new Error(holidaysResult.error.message);

  const leaves = (leavesResult.data ?? []).map((row) => {
    const employee = unwrapRelation(row.employees);
    const leaveType = unwrapRelation(row.leave_types);
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: employee
        ? formatCleanEmployeeName(employee.first_name, employee.last_name)
        : "",
      leaveTypeName: leaveType?.name ?? "",
      startDate: row.start_date,
      endDate: row.end_date,
      totalDays: Number(row.total_days),
      isHalfDay: row.is_half_day,
      leaveStatus: row.leave_status as LeaveCalendarEntry["leaveStatus"],
    };
  });

  const holidays = (holidaysResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    holidayDate: row.holiday_date,
    isOptional: row.is_optional,
  }));

  return { leaves, holidays, calendar: runtime.calendar };
}

/**
 * Calendar data scoped to a single employee — only their own leave requests plus
 * company holidays for the month. Used by the Employee Self-Service leave module so
 * an employee never sees other people's leave on the calendar.
 */
export async function getEmployeeLeaveCalendarData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  month: number,
  year: number,
): Promise<{
  leaves: LeaveCalendarEntry[];
  holidays: LeaveHolidayEntry[];
  calendar: LeaveCalendarContext;
}> {
  const employeeId = profile.employee.id;
  const organizationId = profile.employee.organizationId;
  const range = getMonthDateRange(month, year);

  const [leavesResult, holidaysResult, runtime] = await Promise.all([
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select(
        `id, start_date, end_date, total_days, is_half_day, leave_status,
         leave_types:leave_type_id (name)`,
      )
      .eq("employee_id", employeeId)
      .in("leave_status", ["approved", "pending"])
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
    loadLeavePolicyRuntime(supabase, organizationId),
  ]);

  if (leavesResult.error) throw new Error(leavesResult.error.message);
  if (holidaysResult.error) throw new Error(holidaysResult.error.message);

  const leaves = (leavesResult.data ?? []).map((row) => {
    const leaveType = unwrapRelation(row.leave_types);
    const typeName = leaveType?.name ?? "Leave";
    return {
      id: row.id,
      employeeId,
      // On the personal calendar the chip shows the leave type (not a name).
      employeeName: typeName,
      leaveTypeName: typeName,
      startDate: row.start_date,
      endDate: row.end_date,
      totalDays: Number(row.total_days),
      isHalfDay: row.is_half_day,
      leaveStatus: row.leave_status as LeaveCalendarEntry["leaveStatus"],
    };
  });

  const holidays = (holidaysResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    holidayDate: row.holiday_date,
    isOptional: row.is_optional,
  }));

  return { leaves, holidays, calendar: runtime.calendar };
}

/** Cap filter dropdown size — full org employee dumps dominate team hub latency. */
const FILTER_EMPLOYEE_LOOKUP_LIMIT = 250;

export async function getLeaveLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
  options?: { selfApplicant?: LookupOption | null },
): Promise<LeaveLookups> {
  const selfApplicant = options?.selfApplicant ?? null;
  const [leaveTypesResult, departments, branches, employeesResult, employmentTypes] =
    await Promise.all([
      supabase
        .schema("hrms")
        .from("leave_types")
        .select("id, name, code, deleted_at")
        .eq("organization_id", organizationId)
        .in("code", [...ALLOWED_LEAVE_TYPE_CODES]),
      selfApplicant
        ? Promise.resolve([] as LookupOption[])
        : getDepartments(supabase, organizationId),
      selfApplicant
        ? Promise.resolve([] as LookupOption[])
        : getBranches(supabase, organizationId),
      selfApplicant
        ? Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string; employee_code: string }[], error: null })
        : supabase
            .schema("hrms")
            .from("employees")
            .select("id, first_name, last_name, employee_code")
            .eq("organization_id", organizationId)
            .is("deleted_at", null)
            .in("employment_status", ["active", "probation", "on_leave"])
            .order("first_name")
            .limit(FILTER_EMPLOYEE_LOOKUP_LIMIT),
      selfApplicant
        ? Promise.resolve([] as LookupOption[])
        : getEmploymentTypes(supabase, organizationId),
    ]);

  if (leaveTypesResult.error) throw new Error(leaveTypesResult.error.message);
  if (employeesResult.error) throw new Error(employeesResult.error.message);

  const leaveTypesByCode = new Map<string, { id: string; label: string; code: string }>();
  for (const row of leaveTypesResult.data ?? []) {
    const current = leaveTypesByCode.get(row.code);
    const isLive = row.deleted_at == null;
    if (!current || isLive) {
      leaveTypesByCode.set(row.code, {
        id: row.id,
        label: row.name,
        code: row.code,
      });
    }
  }
  const leaveTypes = sortByLeaveTypeCode([...leaveTypesByCode.values()]);

  const employees = selfApplicant
    ? [selfApplicant]
    : (employeesResult.data ?? []).map((row) => ({
        id: row.id,
        label: `${row.first_name} ${row.last_name}`.trim(),
        code: row.employee_code,
      }));

  // Reuse the same bounded employee list for manager/approver filters (avoids a
  // second full-org employees scan that previously mirrored getManagers()).
  return {
    leaveTypes,
    departments,
    branches,
    employees,
    managers: employees,
    approvers: employees,
    employmentTypes,
  };
}

export async function getEmployeeReportingManagerId(
  supabase: AuthSupabaseClient,
  employeeId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select("reporting_manager_id")
    .eq("id", employeeId)
    .single();

  if (error) throw new Error(error.message);
  return data?.reporting_manager_id ?? null;
}

export {
  HR_LEAVE_APPLICANT_ROLE_CODES,
  isHrLeaveApplicant,
};

export const CEO_LEAVE_APPROVER_ROLE_CODES = [
  "ceo",
  "founder",
  "co_founder",
] as const;

export async function listHrLeaveApplicantEmployeeIds(
  organizationId: string,
): Promise<string[]> {
  // Admin client: auth RLS can hide other users' role rows and miss Super Admin / HR.
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("user_roles")
    .select(
      `
        employee_id,
        roles!inner (code),
        employees!inner (organization_id, deleted_at)
      `,
    )
    .eq("employees.organization_id", organizationId)
    .in("roles.code", [...HR_LEAVE_APPLICANT_ROLE_CODES])
    .is("deleted_at", null)
    .is("employees.deleted_at", null);

  if (error) throw new Error(error.message);

  return Array.from(
    new Set((data ?? []).map((row) => row.employee_id).filter(Boolean)),
  );
}

export function isCeoLeaveApprover(profile: UserProfile): boolean {
  return (
    profile.roles.some((role) =>
      (CEO_LEAVE_APPROVER_ROLE_CODES as readonly string[]).includes(role.code),
    ) || hasPermission(profile.permissionCodes, PORTAL_PERMISSIONS.ceo)
  );
}

export const HR_LEAVE_APPROVER_ROLE_CODES = [
  "hr_admin",
  "hr_executive",
] as const;

export const NO_HR_APPROVER_CONFIGURED_MESSAGE =
  "No HR approver is configured for this employee. Please contact HR/Admin to configure the appropriate HR approver.";

export const NO_CEO_APPROVER_CONFIGURED_MESSAGE =
  "No active CEO is configured to approve this request. Please contact your administrator to assign a CEO approver for your organization.";

export const LEAVE_ALREADY_APPROVED_BY_OTHER_CEO_MESSAGE =
  "This request has already been approved by another CEO.";

export const LEAVE_ALREADY_PROCESSED_MESSAGE =
  "This request has already been processed.";

export type ResolveHrApproverOptions = {
  /** Employee whose leave is being routed (uses assigned_hr_employee_id first). */
  employeeId?: string;
  /** Exclude these employee IDs (e.g. applicant or reporting manager). */
  excludeEmployeeIds?: string[];
};

/**
 * Eligible HR leave approvers: hr_admin / hr_executive only.
 * Super Admin is not automatically eligible.
 */
export async function employeeIsEligibleHrLeaveApprover(
  organizationId: string,
  candidateEmployeeId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data: employee, error: employeeError } = await admin
    .schema("hrms")
    .from("employees")
    .select("id, organization_id, employment_status, status, deleted_at")
    .eq("id", candidateEmployeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) return false;
  if (employee.status !== "active") return false;
  if (!["active", "probation"].includes(employee.employment_status)) return false;

  const { data: roleRows, error: roleError } = await admin
    .schema("hrms")
    .from("user_roles")
    .select("roles!inner (code)")
    .eq("employee_id", candidateEmployeeId)
    .is("deleted_at", null)
    .in("roles.code", [...HR_LEAVE_APPROVER_ROLE_CODES]);

  if (roleError) throw new Error(roleError.message);
  return (roleRows ?? []).length > 0;
}

export async function assertEligibleHrLeaveApprover(
  organizationId: string,
  candidateEmployeeId: string,
  options?: { fieldLabel?: string },
): Promise<void> {
  const ok = await employeeIsEligibleHrLeaveApprover(
    organizationId,
    candidateEmployeeId,
  );
  if (!ok) {
    throw new Error(
      options?.fieldLabel
        ? `${options.fieldLabel} must be an active HR Admin or HR Executive in this organization`
        : "Selected HR approver must be an active HR Admin or HR Executive in this organization",
    );
  }
}

export async function listEligibleHrLeaveApproverOptions(
  organizationId: string,
  excludeEmployeeId?: string,
): Promise<{ id: string; label: string; code: string }[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("user_roles")
    .select(
      `
        employee_id,
        roles!inner (code),
        employees!inner (
          id,
          first_name,
          last_name,
          employee_code,
          organization_id,
          employment_status,
          status,
          deleted_at
        )
      `,
    )
    .eq("employees.organization_id", organizationId)
    .in("roles.code", [...HR_LEAVE_APPROVER_ROLE_CODES])
    .is("deleted_at", null)
    .is("employees.deleted_at", null)
    .eq("employees.status", "active")
    .in("employees.employment_status", ["active", "probation"]);

  if (error) throw new Error(error.message);

  const byId = new Map<string, { id: string; label: string; code: string }>();
  for (const row of data ?? []) {
    const employee = Array.isArray(row.employees)
      ? row.employees[0]
      : row.employees;
    if (!employee?.id) continue;
    if (excludeEmployeeId && employee.id === excludeEmployeeId) continue;
    if (byId.has(employee.id)) continue;
    byId.set(employee.id, {
      id: employee.id,
      label: `${employee.first_name} ${employee.last_name}`.trim(),
      code: employee.employee_code,
    });
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

async function getOrganizationDefaultHrApproverEmployeeId(
  organizationId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const settings = (data?.settings as Record<string, unknown> | null) ?? {};
  const leaveRules =
    (settings.leave_rules as Record<string, unknown> | undefined) ?? {};
  const raw = leaveRules.default_hr_approver_employee_id;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

async function getEmployeeAssignedHrEmployeeId(
  organizationId: string,
  employeeId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("employees")
    .select("assigned_hr_employee_id, organization_id")
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.assigned_hr_employee_id ?? null;
}

/**
 * Deterministic HR leave approver routing (no arbitrary LIMIT 1):
 * 1. Employee.assigned_hr_employee_id (if valid eligible HR)
 * 2. Organization leave_rules.default_hr_approver_employee_id (if valid)
 * 3. First eligible HR Admin/Executive in the org (sorted by name)
 * 4. null → caller must fail closed
 */
export async function getHrApproverEmployeeId(
  _supabase: AuthSupabaseClient,
  organizationId: string,
  options?: ResolveHrApproverOptions,
): Promise<string | null> {
  const exclude = new Set(
    (options?.excludeEmployeeIds ?? []).filter(Boolean),
  );

  const tryCandidate = async (candidateId: string | null | undefined) => {
    if (!candidateId || exclude.has(candidateId)) return null;
    const eligible = await employeeIsEligibleHrLeaveApprover(
      organizationId,
      candidateId,
    );
    return eligible ? candidateId : null;
  };

  if (options?.employeeId) {
    const assigned = await getEmployeeAssignedHrEmployeeId(
      organizationId,
      options.employeeId,
    );
    const fromAssigned = await tryCandidate(assigned);
    if (fromAssigned) return fromAssigned;
  }

  const orgDefault = await getOrganizationDefaultHrApproverEmployeeId(
    organizationId,
  );
  const fromOrgDefault = await tryCandidate(orgDefault);
  if (fromOrgDefault) return fromOrgDefault;

  const eligibleHrs = await listEligibleHrLeaveApproverOptions(
    organizationId,
    options?.employeeId,
  );
  return eligibleHrs.find((hr) => !exclude.has(hr.id))?.id ?? null;
}

export async function listCeoLeaveApproverEmployeeIds(
  organizationId: string,
): Promise<string[]> {
  const admin = createAdminClient();

  const [byRoleResult, byPermissionResult] = await Promise.all([
    admin
      .schema("hrms")
      .from("user_roles")
      .select(
        `
          employee_id,
          roles!inner (code),
          employees!inner (organization_id, deleted_at)
        `,
      )
      .eq("employees.organization_id", organizationId)
      .in("roles.code", [...CEO_LEAVE_APPROVER_ROLE_CODES])
      .is("deleted_at", null)
      .is("employees.deleted_at", null),
    admin
      .schema("hrms")
      .from("role_permissions")
      .select(
        `
          role_id,
          permissions!inner (code),
          roles!inner (id, organization_id, deleted_at)
        `,
      )
      .eq("permissions.code", PORTAL_PERMISSIONS.ceo)
      .eq("roles.organization_id", organizationId)
      .is("deleted_at", null)
      .is("roles.deleted_at", null)
      .is("permissions.deleted_at", null),
  ]);

  if (byRoleResult.error) throw new Error(byRoleResult.error.message);
  if (byPermissionResult.error) throw new Error(byPermissionResult.error.message);

  const ids = new Set<string>(
    (byRoleResult.data ?? []).map((row) => row.employee_id).filter(Boolean),
  );

  const roleIds = Array.from(
    new Set(
      (byPermissionResult.data ?? [])
        .map((row) => row.role_id)
        .filter(Boolean),
    ),
  );

  if (roleIds.length > 0) {
    const { data: userRoles, error: userRolesError } = await admin
      .schema("hrms")
      .from("user_roles")
      .select(
        `
          employee_id,
          employees!inner (organization_id, deleted_at)
        `,
      )
      .in("role_id", roleIds)
      .eq("employees.organization_id", organizationId)
      .is("deleted_at", null)
      .is("employees.deleted_at", null);

    if (userRolesError) throw new Error(userRolesError.message);
    for (const row of userRoles ?? []) {
      if (row.employee_id) ids.add(row.employee_id);
    }
  }

  return Array.from(ids);
}

async function filterActiveCeoEmployeeIds(
  organizationId: string,
  ceoIds: string[],
): Promise<string[]> {
  if (ceoIds.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("employees")
    .select("id, employment_status, status")
    .eq("organization_id", organizationId)
    .in("id", ceoIds)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter(
      (row) =>
        row.status === "active" &&
        ["active", "probation"].includes(row.employment_status),
    )
    .map((row) => row.id);
}

/**
 * Active CEO approvers for executive leave routing (HR / Manager applicants).
 * Fail-closed when none are configured.
 */
export async function requireActiveCeoApproverEmployeeIds(
  _supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<string[]> {
  const ceoIds = await listCeoLeaveApproverEmployeeIds(organizationId);
  const activeIds = await filterActiveCeoEmployeeIds(organizationId, ceoIds);

  if (activeIds.length === 0) {
    console.error("[leave] CEO routing failed (fail-closed)", {
      organizationId,
      reason: "no_active_ceo",
      configuredCeoCount: ceoIds.length,
    });
    throw new Error(NO_CEO_APPROVER_CONFIGURED_MESSAGE);
  }

  return activeIds.sort();
}

/**
 * @deprecated Prefer requireActiveCeoApproverEmployeeIds for leave. Returns the first
 * active CEO for single-assignee workflows (e.g. attendance regularization).
 */
export async function requireCeoApproverEmployeeId(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<string> {
  const activeIds = await requireActiveCeoApproverEmployeeIds(supabase, organizationId);
  return activeIds[0]!;
}

/**
 * Repair/sync helper — when a logged-in CEO opens their queue.
 * Uses preferred CEO when valid; otherwise requires exactly one active CEO.
 */
export async function resolveCeoApproverEmployeeIdForSync(
  organizationId: string,
  preferredCeoEmployeeId?: string | null,
): Promise<string | null> {
  const ceoIds = await listCeoLeaveApproverEmployeeIds(organizationId);
  const activeIds = await filterActiveCeoEmployeeIds(organizationId, ceoIds);

  if (preferredCeoEmployeeId && activeIds.includes(preferredCeoEmployeeId)) {
    return preferredCeoEmployeeId;
  }

  if (activeIds.length === 1) {
    return activeIds[0]!;
  }

  return null;
}

/** @deprecated Use requireCeoApproverEmployeeId for new requests or resolveCeoApproverEmployeeIdForSync for repair. */
export async function getCeoApproverEmployeeId(
  _supabase: AuthSupabaseClient,
  organizationId: string,
  preferredCeoEmployeeId?: string | null,
): Promise<string | null> {
  return resolveCeoApproverEmployeeIdForSync(
    organizationId,
    preferredCeoEmployeeId,
  );
}

export async function listManagerLeaveApplicantEmployeeIds(
  organizationId: string,
): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("user_roles")
    .select(
      `
        employee_id,
        roles!inner (code),
        employees!inner (organization_id, deleted_at)
      `,
    )
    .eq("employees.organization_id", organizationId)
    .in("roles.code", ["manager"])
    .is("deleted_at", null)
    .is("employees.deleted_at", null);

  if (error) throw new Error(error.message);

  const managerIds = Array.from(
    new Set((data ?? []).map((row) => row.employee_id).filter(Boolean)),
  );
  if (managerIds.length === 0) return [];

  const hrApplicantIds = new Set(
    await listHrLeaveApplicantEmployeeIds(organizationId),
  );
  return managerIds.filter((id) => !hrApplicantIds.has(id));
}

export async function listExecutiveLeaveApplicantEmployeeIds(
  organizationId: string,
): Promise<string[]> {
  const [hrIds, managerIds] = await Promise.all([
    listHrLeaveApplicantEmployeeIds(organizationId),
    listManagerLeaveApplicantEmployeeIds(organizationId),
  ]);
  return Array.from(new Set([...hrIds, ...managerIds]));
}

export async function getEmployeeRoleCodes(
  _supabase: AuthSupabaseClient,
  employeeId: string,
): Promise<string[]> {
  const byEmployee = await getEmployeeRoleCodesByEmployeeIds([employeeId]);
  return byEmployee.get(employeeId) ?? [];
}

export async function getEmployeeRoleCodesByEmployeeIds(
  employeeIds: string[],
): Promise<Map<string, string[]>> {
  const uniqueIds = [...new Set(employeeIds.filter(Boolean))];
  const result = new Map<string, string[]>();
  if (uniqueIds.length === 0) return result;

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("user_roles")
    .select("employee_id, roles!inner (code)")
    .in("employee_id", uniqueIds)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    const code = role?.code as string | undefined;
    if (!code || !row.employee_id) continue;
    const current = result.get(row.employee_id) ?? [];
    current.push(code);
    result.set(row.employee_id, current);
  }

  return result;
}

/**
 * Ensures pending leave from HR / Manager applicants has a pending level-1 approval
 * row for every active CEO in the organization (any-of CEO approval queue).
 */
export async function ensurePendingExecutiveLeaveAssignedToCeo(
  organizationId: string,
  _preferredCeoEmployeeId?: string | null,
): Promise<void> {
  const ceoIds = await filterActiveCeoEmployeeIds(
    organizationId,
    await listCeoLeaveApproverEmployeeIds(organizationId),
  );
  if (ceoIds.length === 0) return;

  const executiveApplicantIds =
    await listExecutiveLeaveApplicantEmployeeIds(organizationId);
  if (executiveApplicantIds.length === 0) return;

  const admin = createAdminClient();
  const ceoIdSet = new Set(ceoIds);
  const now = new Date().toISOString();

  // Clear leftover pending approval rows on leaves that are already finalized
  // (e.g. multi-CEO approve finalized leave_status before sibling cancel ran).
  const { data: finalizedLeaves, error: finalizedError } = await admin
    .schema("hrms")
    .from("leave_requests")
    .select("id")
    .in("employee_id", executiveApplicantIds)
    .in("leave_status", ["approved", "rejected", "cancelled", "withdrawn"])
    .is("deleted_at", null);

  if (finalizedError) throw new Error(finalizedError.message);

  const finalizedIds = (finalizedLeaves ?? []).map((row) => row.id);
  if (finalizedIds.length > 0) {
    const { error: orphanError } = await admin
      .schema("hrms")
      .from("leave_approvals")
      .update({
        approval_status: "skipped",
        deleted_at: now,
        updated_at: now,
      })
      .in("leave_request_id", finalizedIds)
      .eq("approval_status", "pending")
      .is("deleted_at", null);

    if (orphanError) throw new Error(orphanError.message);
  }

  const { data: pendingLeaves, error: leaveError } = await admin
    .schema("hrms")
    .from("leave_requests")
    .select("id, created_by")
    .in("employee_id", executiveApplicantIds)
    .eq("leave_status", "pending")
    .is("deleted_at", null);

  if (leaveError) throw new Error(leaveError.message);
  const leaveRows = pendingLeaves ?? [];
  if (leaveRows.length === 0) return;

  const leaveIds = leaveRows.map((row) => row.id);

  const { data: existingApprovals, error: approvalsError } = await admin
    .schema("hrms")
    .from("leave_approvals")
    .select(
      "id, leave_request_id, approval_status, approval_level, approver_employee_id, deleted_at",
    )
    .in("leave_request_id", leaveIds);

  if (approvalsError) throw new Error(approvalsError.message);

  const pendingByLeaveAndApprover = new Map<string, string>();
  const approvalIdsToCancel: string[] = [];

  for (const row of existingApprovals ?? []) {
    if (row.deleted_at) continue;

    const key = `${row.leave_request_id}:${row.approver_employee_id}`;
    if (
      row.approval_level === 1 &&
      row.approval_status === "pending" &&
      ceoIdSet.has(row.approver_employee_id)
    ) {
      pendingByLeaveAndApprover.set(key, row.id);
      continue;
    }

    if (
      row.approval_level === 1 &&
      row.approval_status === "pending" &&
      !ceoIdSet.has(row.approver_employee_id)
    ) {
      approvalIdsToCancel.push(row.id);
    }
  }

  if (approvalIdsToCancel.length > 0) {
    const { error: cancelError } = await admin
      .schema("hrms")
      .from("leave_approvals")
      .update({
        approval_status: "skipped",
        deleted_at: now,
        updated_at: now,
      })
      .in("id", approvalIdsToCancel);

    if (cancelError) throw new Error(cancelError.message);
  }

  const rowsToInsert: Array<{
    leave_request_id: string;
    approver_employee_id: string;
    approval_level: number;
    approval_status: "pending";
    status: "active";
    created_by: string;
    updated_by: string;
  }> = [];

  for (const leave of leaveRows) {
    for (const ceoId of ceoIds) {
      const key = `${leave.id}:${ceoId}`;
      if (pendingByLeaveAndApprover.has(key)) continue;
      rowsToInsert.push({
        leave_request_id: leave.id,
        approver_employee_id: ceoId,
        approval_level: 1,
        approval_status: "pending",
        status: "active",
        created_by: leave.created_by,
        updated_by: leave.created_by,
      });
    }
  }

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await admin
      .schema("hrms")
      .from("leave_approvals")
      .insert(rowsToInsert);

    if (insertError && insertError.code !== "23505") {
      throw new Error(insertError.message);
    }
  }
}

/** @deprecated Use ensurePendingExecutiveLeaveAssignedToCeo */
export async function ensurePendingHrLeaveAssignedToCeo(
  organizationId: string,
  preferredCeoEmployeeId?: string | null,
): Promise<void> {
  return ensurePendingExecutiveLeaveAssignedToCeo(
    organizationId,
    preferredCeoEmployeeId,
  );
}
