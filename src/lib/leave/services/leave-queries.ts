import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  LeaveBalanceItem,
  LeaveCalendarEntry,
  LeaveHolidayEntry,
  LeaveListParams,
  LeaveListResult,
  LeaveLookups,
  LeaveSortField,
  LeaveSummary,
} from "@/types/leave";
import { leaveListParamsSchema } from "@/lib/validations/leave";
import { ALLOWED_LEAVE_TYPE_CODES } from "@/lib/leave/constants";
import {
  getBranches,
  getDepartments,
  getEmploymentTypes,
  getManagers,
} from "@/lib/employees/services/employee-queries";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import {
  getCurrentBalanceYear,
  getMonthDateRange,
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
    branch_id: string;
    departments: { name: string } | { name: string }[] | null;
    branches: { name: string } | { name: string }[] | null;
  } | {
    employee_code: string;
    first_name: string;
    last_name: string;
    department_id: string | null;
    branch_id: string;
    departments: { name: string } | { name: string }[] | null;
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
  } = parseListParams(params);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

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
          email,
          department_id,
          branch_id,
          employment_type_id,
          reporting_manager_id,
          departments:department_id (name),
          branches:branch_id (name)
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
    .is("deleted_at", null);

  if (dateFrom && dateTo) {
    query = query.lte("start_date", dateTo).gte("end_date", dateFrom);
  } else if (month && year) {
    const range = getMonthDateRange(month, year);
    query = query
      .gte("start_date", range.start)
      .lte("end_date", range.end);
  } else if (year) {
    query = query
      .gte("start_date", `${year}-01-01`)
      .lte("end_date", `${year}-12-31`);
  }

  if (leaveStatus) query = query.eq("leave_status", leaveStatus);
  if (leaveTypeId) query = query.eq("leave_type_id", leaveTypeId);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (createdByEmployeeId) query = query.eq("employee_id", createdByEmployeeId);
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
  if (approverId) {
    query = query.eq("leave_approvals.approver_employee_id", approverId);
  }

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `employee_code.ilike.${term},first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`,
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

  return {
    data: rows.map((row) => {
      const employee = unwrapRelation(row.employees);
      const leaveType = unwrapRelation(row.leave_types);
      const department = unwrapRelation(employee?.departments ?? null);
      const branch = unwrapRelation(employee?.branches ?? null);
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
        leaveStatus: row.leave_status as LeaveListResult["data"][number]["leaveStatus"],
        appliedAt: row.created_at,
        approverName: currentApprover
          ? `${currentApprover.first_name} ${currentApprover.last_name}`
          : null,
        currentApprovalLevel: pendingApproval?.approval_level ?? null,
      };
    }),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getLeaveSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  month?: number,
  year?: number,
): Promise<LeaveSummary> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const summaryYear = year ?? Number.parseInt(today.slice(0, 4), 10);
  const summaryMonth = month ?? Number.parseInt(today.slice(5, 7), 10);
  const monthRange = getMonthDateRange(summaryMonth, summaryYear);

  const [pendingResult, approvedResult, rejectedResult, onLeaveResult, balancesResult, upcomingResult] =
    await Promise.all([
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select("id, employees!inner(organization_id)", { count: "exact", head: true })
      .eq("leave_status", "pending")
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
      .from("leave_requests")
      .select("employee_id, employees!inner(organization_id)", { count: "exact", head: true })
      .eq("leave_status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .eq("employees.organization_id", organizationId)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_balances")
      .select("allocated_days, used_days, employees!inner(organization_id)")
      .eq("balance_year", getCurrentBalanceYear(today))
      .eq("employees.organization_id", organizationId)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select("id, employees!inner(organization_id)", { count: "exact", head: true })
      .eq("leave_status", "approved")
      .gt("start_date", today)
      .eq("employees.organization_id", organizationId)
      .is("deleted_at", null),
  ]);

  let balanceUtilizationPercent = 0;
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
      balanceUtilizationPercent = Math.round((totals.used / totals.allocated) * 100);
    }
  }

  return {
    pendingRequests: pendingResult.count ?? 0,
    approvedThisMonth: approvedResult.count ?? 0,
    rejectedThisMonth: rejectedResult.count ?? 0,
    employeesOnLeaveToday: onLeaveResult.count ?? 0,
    balanceUtilizationPercent,
    upcomingPlannedLeaves: upcomingResult.count ?? 0,
  };
}

export async function getEmployeeLeaveBalanceSnapshot(
  supabase: AuthSupabaseClient,
  employeeId: string,
  balanceYear = getCurrentBalanceYear(),
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_balances")
    .select(
      "allocated_days, used_days, pending_days, balance_days, leave_types:leave_type_id (name, code)",
    )
    .eq("employee_id", employeeId)
    .eq("balance_year", balanceYear)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const priorityCodes: string[] = [...ALLOWED_LEAVE_TYPE_CODES];

  return (data ?? [])
    .map((row) => {
      const leaveType = unwrapRelation(
        row.leave_types as
          | { name: string; code: string }
          | { name: string; code: string }[]
          | null,
      );

      return {
        leaveTypeCode: leaveType?.code ?? "",
        leaveTypeName: leaveType?.name ?? "Leave",
        allocatedDays: Number(row.allocated_days),
        usedDays: Number(row.used_days),
        pendingDays: Number(row.pending_days),
        balanceDays: Number(row.balance_days),
      };
    })
    .filter((row) => priorityCodes.includes(row.leaveTypeCode))
    .sort(
      (a, b) =>
        priorityCodes.indexOf(a.leaveTypeCode) -
        priorityCodes.indexOf(b.leaveTypeCode),
    );
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

  return (data ?? []).map((row) => {
    const employee = unwrapRelation(row.employees);
    const leaveType = unwrapRelation(row.leave_types);
    const department = unwrapRelation(employee?.departments ?? null);

    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeCode: employee?.employee_code ?? "",
      employeeName: employee
        ? `${employee.first_name} ${employee.last_name}`
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
  });
}

export async function getLeaveCalendarData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  month: number,
  year: number,
): Promise<{ leaves: LeaveCalendarEntry[]; holidays: LeaveHolidayEntry[] }> {
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
        ? `${employee.first_name} ${employee.last_name}`
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

  return { leaves, holidays };
}

export async function getLeaveLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<LeaveLookups> {
  const [leaveTypesResult, departments, branches, employeesResult, managers, employmentTypes] =
    await Promise.all([
      supabase
        .schema("hrms")
        .from("leave_types")
        .select("id, name, code")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .is("deleted_at", null)
        .in("code", [...ALLOWED_LEAVE_TYPE_CODES])
        .order("name"),
      getDepartments(supabase, organizationId),
      getBranches(supabase, organizationId),
      supabase
        .schema("hrms")
        .from("employees")
        .select("id, first_name, last_name, employee_code")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .in("employment_status", ["active", "probation", "on_leave"])
        .order("first_name"),
      getManagers(supabase, organizationId),
      getEmploymentTypes(supabase, organizationId),
    ]);

  if (leaveTypesResult.error) throw new Error(leaveTypesResult.error.message);
  if (employeesResult.error) throw new Error(employeesResult.error.message);

  const leaveTypes = (leaveTypesResult.data ?? []).map((row) => ({
    id: row.id,
    label: row.name,
    code: row.code,
  }));

  const employees = (employeesResult.data ?? []).map((row) => ({
    id: row.id,
    label: `${row.first_name} ${row.last_name}`.trim(),
    code: row.employee_code,
  }));

  return {
    leaveTypes,
    departments,
    branches,
    employees,
    managers,
    approvers: managers,
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

export async function getHrApproverEmployeeId(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select(
      `
        employee_id,
        roles!inner (code),
        employees!inner (organization_id, employment_status, deleted_at)
      `,
    )
    .eq("employees.organization_id", organizationId)
    .in("roles.code", ["hr_admin", "super_admin"])
    .is("employees.deleted_at", null)
    .limit(1);

  if (error) throw new Error(error.message);
  const row = data?.[0];
  return row?.employee_id ?? null;
}
