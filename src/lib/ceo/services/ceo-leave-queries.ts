import {
  addDays,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { CeoChartItem } from "@/types/ceo-dashboard";
import type {
  CeoApprovalQueueItem,
  CeoDepartmentLeaveOverview,
  CeoForwardTarget,
  CeoLeaveAnalytics,
  CeoLeaveCalendar,
  CeoLeaveDetail,
  CeoLeaveFilters,
  CeoLeaveInsight,
  CeoLeaveRecord,
  CeoLeaveSummary,
} from "@/types/ceo-leave";
import type { HalfDayPeriod, LeaveLookups, LeaveStatus } from "@/types/leave";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { ALLOWED_LEAVE_TYPE_CODES } from "@/lib/leave/constants";
import {
  getCurrentBalanceYear,
  getMonthDateRange,
} from "@/lib/leave/services/leave-utils";
import {
  getEmployeeLeaveBalanceSnapshot,
  getLeaveCalendarData,
  getLeaveLookups,
} from "@/lib/leave/services/leave-queries";
import { getLeaveRequestById } from "@/lib/leave/services/leave-detail";

const APPROVER_ROLE_CODES = [
  "super_admin",
  "ceo",
  "founder",
  "co_founder",
  "hr_admin",
  "hr_executive",
  "manager",
];

const LEAVE_ROW_SELECT = `
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
    email,
    department_id,
    branch_id,
    organization_id,
    reporting_manager_id,
    departments:department_id (name),
    branches:branch_id (name),
    reporting_manager:reporting_manager_id (first_name, last_name)
  ),
  leave_types:leave_type_id (name, code),
  leave_approvals (
    approval_level,
    approval_status,
    approver_employee_id,
    employees:approver_employee_id (first_name, last_name)
  )
`;

type NameRow = { first_name: string; last_name: string };

type LeaveRow = {
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
  employees:
    | {
        employee_code: string;
        first_name: string;
        last_name: string;
        department_id: string | null;
        branch_id: string | null;
        departments: { name: string } | { name: string }[] | null;
        branches: { name: string } | { name: string }[] | null;
        reporting_manager: NameRow | NameRow[] | null;
      }
    | Array<{
        employee_code: string;
        first_name: string;
        last_name: string;
        department_id: string | null;
        branch_id: string | null;
        departments: { name: string } | { name: string }[] | null;
        branches: { name: string } | { name: string }[] | null;
        reporting_manager: NameRow | NameRow[] | null;
      }>
    | null;
  leave_types: { name: string; code: string } | { name: string; code: string }[] | null;
  leave_approvals: Array<{
    approval_level: number;
    approval_status: string;
    approver_employee_id: string;
    employees: NameRow | NameRow[] | null;
  }> | null;
};

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function fullName(row: NameRow | null): string | null {
  if (!row) return null;
  return `${row.first_name} ${row.last_name}`.trim() || null;
}

function mapLeaveRow(row: LeaveRow): CeoLeaveRecord {
  const employee = unwrapRelation(row.employees);
  const leaveType = unwrapRelation(row.leave_types);
  const department = unwrapRelation(employee?.departments ?? null);
  const branch = unwrapRelation(employee?.branches ?? null);
  const manager = unwrapRelation(employee?.reporting_manager ?? null);

  const approvals = row.leave_approvals ?? [];
  const pendingApproval = approvals
    .filter((a) => a.approval_status === "pending")
    .sort((a, b) => a.approval_level - b.approval_level)[0];
  const currentApprover = pendingApproval
    ? unwrapRelation(pendingApproval.employees)
    : null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: employee?.employee_code ?? "",
    employeeName: employee ? `${employee.first_name} ${employee.last_name}`.trim() : "",
    departmentId: employee?.department_id ?? null,
    departmentName: department?.name ?? null,
    branchId: employee?.branch_id ?? null,
    branchName: branch?.name ?? null,
    leaveTypeName: leaveType?.name ?? "",
    leaveTypeCode: leaveType?.code ?? "",
    startDate: row.start_date,
    endDate: row.end_date,
    totalDays: Number(row.total_days),
    isHalfDay: row.is_half_day,
    halfDayPeriod:
      row.half_day_period === "morning" || row.half_day_period === "afternoon"
        ? (row.half_day_period as HalfDayPeriod)
        : null,
    reason: row.reason,
    leaveStatus: row.leave_status as LeaveStatus,
    appliedAt: row.created_at,
    managerName: fullName(manager),
    currentApprovalLevel: pendingApproval?.approval_level ?? null,
    currentApproverName: fullName(currentApprover),
  };
}

export async function listCeoTodaysLeave(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoLeaveFilters = {},
): Promise<CeoLeaveRecord[]> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const status: LeaveStatus = filters.leaveStatus ?? "approved";

  let query = supabase
    .schema("hrms")
    .from("leave_requests")
    .select(LEAVE_ROW_SELECT)
    .eq("employees.organization_id", organizationId)
    .eq("leave_status", status)
    .lte("start_date", today)
    .gte("end_date", today)
    .is("deleted_at", null);

  if (filters.departmentId) query = query.eq("employees.department_id", filters.departmentId);
  if (filters.branchId) query = query.eq("employees.branch_id", filters.branchId);
  if (filters.leaveTypeId) query = query.eq("leave_type_id", filters.leaveTypeId);
  if (filters.reportingManagerId) {
    query = query.eq("employees.reporting_manager_id", filters.reportingManagerId);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `employee_code.ilike.${term},first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`,
      { referencedTable: "employees" },
    );
  }

  query = query.order("start_date", { ascending: true }).limit(100);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as LeaveRow[]).map(mapLeaveRow);
}

export async function listCeoUpcomingLeave(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoLeaveFilters = {},
): Promise<CeoLeaveRecord[]> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const horizon = format(addDays(new Date(`${today}T00:00:00`), 60), "yyyy-MM-dd");

  let query = supabase
    .schema("hrms")
    .from("leave_requests")
    .select(LEAVE_ROW_SELECT)
    .eq("employees.organization_id", organizationId)
    .is("deleted_at", null);

  // A supplied date range overrides the default "next 60 days" horizon.
  if (filters.dateFrom || filters.dateTo) {
    query = query
      .gte("start_date", filters.dateFrom ?? today)
      .lte("start_date", filters.dateTo ?? horizon);
  } else {
    query = query.gt("start_date", today).lte("start_date", horizon);
  }

  if (filters.leaveStatus) {
    query = query.eq("leave_status", filters.leaveStatus);
  } else {
    query = query.in("leave_status", ["approved", "pending"]);
  }

  if (filters.departmentId) query = query.eq("employees.department_id", filters.departmentId);
  if (filters.branchId) query = query.eq("employees.branch_id", filters.branchId);
  if (filters.leaveTypeId) query = query.eq("leave_type_id", filters.leaveTypeId);
  if (filters.reportingManagerId) {
    query = query.eq("employees.reporting_manager_id", filters.reportingManagerId);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `employee_code.ilike.${term},first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`,
      { referencedTable: "employees" },
    );
  }

  query = query.order("start_date", { ascending: true }).limit(100);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as LeaveRow[]).map(mapLeaveRow);
}

export async function listCeoApprovalQueue(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoApprovalQueueItem[]> {
  const organizationId = profile.employee.organizationId;
  const ceoEmployeeId = profile.employee.id;

  const { data: pendingRows, error: pendingError } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .select("id, approval_level, leave_request_id")
    .eq("approver_employee_id", ceoEmployeeId)
    .eq("approval_status", "pending")
    .is("deleted_at", null);

  if (pendingError) throw new Error(pendingError.message);
  const pending = pendingRows ?? [];
  if (pending.length === 0) return [];

  const requestIds = Array.from(new Set(pending.map((r) => r.leave_request_id)));
  const levelByRequest = new Map<string, { id: string; level: number }>();
  pending.forEach((r) => {
    levelByRequest.set(r.leave_request_id, { id: r.id, level: r.approval_level });
  });

  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select(LEAVE_ROW_SELECT)
    .in("id", requestIds)
    .eq("employees.organization_id", organizationId)
    .eq("leave_status", "pending")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const items: CeoApprovalQueueItem[] = [];
  for (const row of (data as unknown as LeaveRow[]) ?? []) {
    const approvals = row.leave_approvals ?? [];
    const activeLevel = approvals
      .filter((a) => a.approval_status === "pending")
      .sort((a, b) => a.approval_level - b.approval_level)[0]?.approval_level;
    const ceoStep = levelByRequest.get(row.id);
    if (!ceoStep || activeLevel == null || ceoStep.level !== activeLevel) continue;

    const record = mapLeaveRow(row);
    items.push({
      ...record,
      approvalRecordId: ceoStep.id,
      submittedAt: row.created_at,
    });
  }

  return items;
}

export async function getCeoLeaveSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  pendingCeoApprovals: number,
): Promise<CeoLeaveSummary> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const summaryYear = Number.parseInt(today.slice(0, 4), 10);
  const summaryMonth = Number.parseInt(today.slice(5, 7), 10);
  const monthRange = getMonthDateRange(summaryMonth, summaryYear);
  const horizon = format(addDays(new Date(`${today}T00:00:00`), 30), "yyyy-MM-dd");

  const [onLeaveResult, upcomingResult, approvedResult, rejectedResult, balancesResult] =
    await Promise.all([
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select("id, employees!inner(organization_id)", { count: "exact", head: true })
        .eq("leave_status", "approved")
        .lte("start_date", today)
        .gte("end_date", today)
        .eq("employees.organization_id", organizationId)
        .is("deleted_at", null),
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select("id, employees!inner(organization_id)", { count: "exact", head: true })
        .in("leave_status", ["approved", "pending"])
        .gt("start_date", today)
        .lte("start_date", horizon)
        .eq("employees.organization_id", organizationId)
        .is("deleted_at", null),
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select("id, employees!inner(organization_id)", { count: "exact", head: true })
        .eq("leave_status", "approved")
        .gte("start_date", monthRange.start)
        .lte("start_date", monthRange.end)
        .eq("employees.organization_id", organizationId)
        .is("deleted_at", null),
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select("id, employees!inner(organization_id)", { count: "exact", head: true })
        .eq("leave_status", "rejected")
        .gte("created_at", `${monthRange.start}T00:00:00`)
        .lte("created_at", `${monthRange.end}T23:59:59`)
        .eq("employees.organization_id", organizationId)
        .is("deleted_at", null),
      supabase
        .schema("hrms")
        .from("leave_balances")
        .select("allocated_days, used_days, employees!inner(organization_id)")
        .eq("balance_year", getCurrentBalanceYear(today))
        .eq("employees.organization_id", organizationId)
        .is("deleted_at", null),
    ]);

  let leaveUtilizationPercent = 0;
  const balanceRows = balancesResult.data ?? [];
  if (balanceRows.length > 0) {
    const totals = balanceRows.reduce(
      (acc, row) => ({
        allocated: acc.allocated + Number(row.allocated_days ?? 0),
        used: acc.used + Number(row.used_days ?? 0),
      }),
      { allocated: 0, used: 0 },
    );
    if (totals.allocated > 0) {
      leaveUtilizationPercent = Math.round((totals.used / totals.allocated) * 100);
    }
  }

  return {
    employeesOnLeaveToday: onLeaveResult.count ?? 0,
    upcomingLeaves: upcomingResult.count ?? 0,
    pendingCeoApprovals,
    approvedThisMonth: approvedResult.count ?? 0,
    rejectedThisMonth: rejectedResult.count ?? 0,
    leaveUtilizationPercent,
  };
}

type EmployeeDeptRow = { department_id: string | null };

export async function getCeoDepartmentLeaveOverview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoLeaveFilters = {},
): Promise<CeoDepartmentLeaveOverview[]> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();

  const [departmentsResult, employeesResult, onLeaveResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .schema("hrms")
      .from("employees")
      .select("department_id")
      .eq("organization_id", organizationId)
      .in("employment_status", ["active", "probation", "on_leave"])
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select("employee_id, employees!inner(department_id, organization_id)")
      .eq("leave_status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .eq("employees.organization_id", organizationId)
      .is("deleted_at", null),
  ]);

  if (departmentsResult.error) throw new Error(departmentsResult.error.message);
  if (employeesResult.error) throw new Error(employeesResult.error.message);
  if (onLeaveResult.error) throw new Error(onLeaveResult.error.message);

  const headcountByDept = new Map<string, number>();
  ((employeesResult.data ?? []) as EmployeeDeptRow[]).forEach((row) => {
    if (!row.department_id) return;
    headcountByDept.set(row.department_id, (headcountByDept.get(row.department_id) ?? 0) + 1);
  });

  const onLeaveByDept = new Map<string, number>();
  ((onLeaveResult.data ?? []) as Array<{ employees: { department_id: string | null } | { department_id: string | null }[] | null }>).forEach(
    (row) => {
      const employee = unwrapRelation(row.employees);
      const deptId = employee?.department_id;
      if (!deptId) return;
      onLeaveByDept.set(deptId, (onLeaveByDept.get(deptId) ?? 0) + 1);
    },
  );

  return ((departmentsResult.data ?? []) as Array<{ id: string; name: string }>)
    .filter((dept) => !filters.departmentId || dept.id === filters.departmentId)
    .map((dept) => {
      const totalEmployees = headcountByDept.get(dept.id) ?? 0;
      const employeesOnLeave = onLeaveByDept.get(dept.id) ?? 0;
      const leavePercent =
        totalEmployees > 0 ? Math.round((employeesOnLeave / totalEmployees) * 100) : 0;
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalEmployees,
        employeesOnLeave,
        leavePercent,
        availabilityPercent: 100 - leavePercent,
      };
    });
}

async function getApproverEmployeeIds(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("employee_id, roles!inner(code), employees!inner(organization_id, deleted_at)")
    .eq("employees.organization_id", organizationId)
    .in("roles.code", APPROVER_ROLE_CODES)
    .is("employees.deleted_at", null);

  if (error) throw new Error(error.message);
  const ids = new Set<string>();
  ((data ?? []) as Array<{ employee_id: string | null }>).forEach((row) => {
    if (row.employee_id) ids.add(row.employee_id);
  });
  return ids;
}

export async function getCeoLeaveAnalytics(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoLeaveAnalytics> {
  const organizationId = profile.employee.organizationId;
  const today = new Date(`${getTodayDateString()}T00:00:00`);
  const windowStart = format(startOfMonth(subMonths(today, 5)), "yyyy-MM-dd");

  const [leavesResult, approvalsResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select(
        `start_date, total_days, leave_status,
         employees!inner (organization_id, departments:department_id (name)),
         leave_types:leave_type_id (name, code)`,
      )
      .in("leave_status", ["approved", "pending"])
      .gte("start_date", windowStart)
      .eq("employees.organization_id", organizationId)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_approvals")
      .select(
        "created_at, acted_at, approval_status, employees:approver_employee_id!inner(organization_id)",
      )
      .eq("approval_status", "approved")
      .gte("created_at", `${windowStart}T00:00:00`)
      .not("acted_at", "is", null)
      .eq("employees.organization_id", organizationId)
      .is("deleted_at", null),
  ]);

  if (leavesResult.error) throw new Error(leavesResult.error.message);
  if (approvalsResult.error) throw new Error(approvalsResult.error.message);

  const leaves = (leavesResult.data ?? []) as Array<{
    start_date: string;
    total_days: number | string;
    leave_status: string;
    employees: { departments: { name: string } | { name: string }[] | null } | { departments: { name: string } | { name: string }[] | null }[] | null;
    leave_types: { name: string; code: string } | { name: string; code: string }[] | null;
  }>;

  const monthBuckets = new Map<string, { label: string; value: number }>();
  for (let i = 5; i >= 0; i -= 1) {
    const date = subMonths(today, i);
    monthBuckets.set(format(date, "yyyy-MM"), { label: format(date, "MMM yyyy"), value: 0 });
  }

  const deptCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  let durationTotal = 0;
  let durationCount = 0;

  leaves.forEach((row) => {
    const monthKey = row.start_date.slice(0, 7);
    const bucket = monthBuckets.get(monthKey);
    if (bucket) bucket.value += 1;

    const employee = unwrapRelation(row.employees);
    const department = unwrapRelation(employee?.departments ?? null);
    if (department?.name) {
      deptCounts.set(department.name, (deptCounts.get(department.name) ?? 0) + 1);
    }

    const leaveType = unwrapRelation(row.leave_types);
    if (leaveType?.name) {
      typeCounts.set(leaveType.name, (typeCounts.get(leaveType.name) ?? 0) + 1);
    }

    if (row.leave_status === "approved") {
      durationTotal += Number(row.total_days);
      durationCount += 1;
    }
  });

  const approvals = (approvalsResult.data ?? []) as Array<{
    created_at: string;
    acted_at: string | null;
  }>;
  let approvalHoursTotal = 0;
  let approvalHoursCount = 0;
  approvals.forEach((row) => {
    if (!row.acted_at) return;
    const diffMs = new Date(row.acted_at).getTime() - new Date(row.created_at).getTime();
    if (diffMs < 0) return;
    approvalHoursTotal += diffMs / (1000 * 60 * 60);
    approvalHoursCount += 1;
  });

  const toChartItems = (map: Map<string, number>): CeoChartItem[] =>
    Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

  return {
    monthlyTrend: Array.from(monthBuckets.values()),
    departmentDistribution: toChartItems(deptCounts),
    leaveTypeDistribution: toChartItems(typeCounts),
    averageApprovalHours:
      approvalHoursCount > 0
        ? Math.round((approvalHoursTotal / approvalHoursCount) * 10) / 10
        : null,
    averageLeaveDurationDays:
      durationCount > 0 ? Math.round((durationTotal / durationCount) * 10) / 10 : null,
  };
}

export function buildCeoLeaveInsights(
  departmentOverview: CeoDepartmentLeaveOverview[],
  analytics: CeoLeaveAnalytics,
  summary: CeoLeaveSummary,
  managersOnLeaveNextWeek: number,
): CeoLeaveInsight[] {
  const insights: CeoLeaveInsight[] = [];

  const topLeaveDept = analytics.departmentDistribution[0];
  if (topLeaveDept && topLeaveDept.value > 0) {
    insights.push({
      id: "top-utilization",
      priority: "medium",
      message: `${topLeaveDept.label} has the highest leave activity recently (${topLeaveDept.value} request${topLeaveDept.value === 1 ? "" : "s"}).`,
    });
  }

  if (managersOnLeaveNextWeek > 0) {
    insights.push({
      id: "managers-on-leave",
      priority: "high",
      message: `${managersOnLeaveNextWeek} manager${managersOnLeaveNextWeek === 1 ? " is" : "s are"} on approved leave in the next 7 days.`,
    });
  }

  const lowAvailability = departmentOverview
    .filter((dept) => dept.totalEmployees > 0 && dept.availabilityPercent < 80)
    .sort((a, b) => a.availabilityPercent - b.availabilityPercent)[0];
  if (lowAvailability) {
    insights.push({
      id: "low-availability",
      priority: "high",
      message: `${lowAvailability.departmentName} availability is at ${lowAvailability.availabilityPercent}% today.`,
    });
  }

  if (summary.pendingCeoApprovals > 0) {
    insights.push({
      id: "pending-ceo",
      priority: "high",
      message: `${summary.pendingCeoApprovals} leave request${summary.pendingCeoApprovals === 1 ? "" : "s"} await your approval.`,
    });
  } else {
    insights.push({
      id: "no-pending-ceo",
      priority: "low",
      message: "You have no leave requests awaiting executive approval.",
    });
  }

  if (analytics.averageApprovalHours != null) {
    insights.push({
      id: "approval-speed",
      priority: "low",
      message: `Average approval turnaround is ${analytics.averageApprovalHours} hour${analytics.averageApprovalHours === 1 ? "" : "s"}.`,
    });
  }

  return insights;
}

export async function countManagersOnLeaveNextWeek(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<number> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const weekAhead = format(addDays(new Date(`${today}T00:00:00`), 7), "yyyy-MM-dd");

  const approverIds = await getApproverEmployeeIds(supabase, organizationId);
  if (approverIds.size === 0) return 0;

  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("employee_id, employees!inner(organization_id)")
    .eq("leave_status", "approved")
    .lte("start_date", weekAhead)
    .gte("end_date", today)
    .eq("employees.organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const onLeave = new Set<string>();
  ((data ?? []) as Array<{ employee_id: string }>).forEach((row) => {
    if (approverIds.has(row.employee_id)) onLeave.add(row.employee_id);
  });
  return onLeave.size;
}

export async function getCeoLeaveCalendar(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  month: number,
  year: number,
): Promise<CeoLeaveCalendar> {
  const { leaves, holidays } = await getLeaveCalendarData(supabase, profile, month, year);
  return { month, year, leaves, holidays };
}

export async function getCeoLeaveLookups(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<LeaveLookups> {
  return getLeaveLookups(supabase, profile.employee.organizationId);
}

const FORWARD_ROLE_CODES = ["manager", "hr_admin", "hr_executive"];
const FORWARD_ROLE_LABELS: Record<string, string> = {
  manager: "Manager",
  hr_admin: "HR Admin",
  hr_executive: "HR Executive",
};

export async function getCeoForwardTargets(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoForwardTarget[]> {
  const organizationId = profile.employee.organizationId;

  const { data, error } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select(
      `employee_id,
       roles!inner(code),
       employees!inner(first_name, last_name, organization_id, employment_status, deleted_at)`,
    )
    .eq("employees.organization_id", organizationId)
    .in("roles.code", FORWARD_ROLE_CODES)
    .in("employees.employment_status", ["active", "probation", "on_leave"])
    .is("employees.deleted_at", null);

  if (error) throw new Error(error.message);

  const byEmployee = new Map<string, CeoForwardTarget>();
  ((data ?? []) as Array<{
    employee_id: string | null;
    roles: { code: string } | { code: string }[] | null;
    employees:
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
  }>).forEach((row) => {
    if (!row.employee_id || row.employee_id === profile.employee.id) return;
    const role = unwrapRelation(row.roles);
    const employee = unwrapRelation(row.employees);
    if (!employee) return;
    const roleLabel = role ? (FORWARD_ROLE_LABELS[role.code] ?? role.code) : "Approver";
    const name = `${employee.first_name} ${employee.last_name}`.trim();
    // Prefer the highest-priority role label when an employee holds several.
    const existing = byEmployee.get(row.employee_id);
    if (!existing) {
      byEmployee.set(row.employee_id, { id: row.employee_id, label: name, roleLabel });
    }
  });

  return Array.from(byEmployee.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export async function getCeoLeaveDetail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
): Promise<CeoLeaveDetail | null> {
  const detail = await getLeaveRequestById(supabase, profile, leaveRequestId);
  if (!detail) return null;

  const balances = await getEmployeeLeaveBalanceSnapshot(supabase, detail.employeeId);

  const activeLevel = detail.approvals
    .filter((a) => a.approvalStatus === "pending")
    .sort((a, b) => a.approvalLevel - b.approvalLevel)[0];
  const canAct =
    detail.leaveStatus === "pending" &&
    activeLevel != null &&
    activeLevel.approverEmployeeId === profile.employee.id;

  return {
    id: detail.id,
    employeeId: detail.employeeId,
    employeeCode: detail.employeeCode,
    employeeName: detail.employeeName,
    departmentName: detail.departmentName,
    branchName: detail.branchName,
    leaveTypeName: detail.leaveTypeName,
    leaveTypeCode: detail.leaveTypeCode,
    startDate: detail.startDate,
    endDate: detail.endDate,
    totalDays: detail.totalDays,
    isHalfDay: detail.isHalfDay,
    halfDayPeriod: detail.halfDayPeriod,
    reason: detail.reason,
    emergencyContactName: detail.emergencyContactName,
    emergencyContactPhone: detail.emergencyContactPhone,
    attachmentPath: detail.attachmentPath,
    leaveStatus: detail.leaveStatus,
    appliedAt: detail.appliedAt,
    updatedAt: detail.updatedAt,
    approvals: detail.approvals,
    balances,
    canAct,
  };
}

export { ALLOWED_LEAVE_TYPE_CODES };
