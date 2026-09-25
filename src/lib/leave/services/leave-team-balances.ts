import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { isExcludedFromAttendanceWorkforce } from "@/lib/employee/directory-listing";
import { filterAppVisibleEmployees } from "@/lib/employees/app-hidden";
import { formatCleanEmployeeName } from "@/lib/employees/parse-employee-name";
import { activeEmploymentStatusFilter } from "@/lib/employees/employment-eligibility";
import {
  getOccupiedDepartments,
  getEmploymentTypes,
} from "@/lib/employees/services/employee-queries";
import {
  OPTIONAL_HOLIDAY_CODE,
  OPTIONAL_HOLIDAY_YEARLY_LIMIT,
  remainingOptionalHolidayEntitlement,
  upcomingOptionalHolidays,
} from "@/lib/leave/optional-holiday";
import {
  formatLeaveMonthYear,
  getCurrentBalanceYear,
  getMonthDateRange,
} from "@/lib/leave/services/leave-utils";
import {
  listAttendanceLeaveDays,
  listAttendanceLopDays,
} from "@/lib/leave/services/leave-attendance-usage";
import { buildTeamLeaveBalanceRows } from "@/lib/leave/services/leave-team-balances-matrix";
import {
  buildMonthScopedLeaveUsageEntries,
  mergeMonthScopedLeaveUsageEntries,
  sumUsageEntryDays,
  usageEntriesFromAttendanceLeaveDays,
  usageEntriesFromAttendanceLopDates,
} from "@/lib/leave/services/leave-team-balances-usage";
import { listOrganizationOptionalHolidays } from "@/lib/leave/services/leave-queries";
import {
  lopDaysFromLeaveRequest,
  roundLeaveDays,
} from "@/lib/leave/services/leave-usage";
import type { UserProfile } from "@/types/auth";
import type {
  TeamLeaveBalanceFilters,
  TeamLeaveBalanceResult,
  TeamLeaveUsageEntry,
} from "@/types/leave";

const IN_CHUNK = 200;
const USAGE_CODES = new Set(["CL", "EL", "OH"]);

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function fetchInChunks<T>(
  ids: string[],
  fetchChunk: (chunk: string[]) => Promise<T[]>,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    out.push(...(await fetchChunk(chunk)));
  }
  return out;
}

function clampMonth(month: number | undefined, fallback: number): number {
  if (!Number.isFinite(month)) return fallback;
  const value = Math.trunc(Number(month));
  if (value < 1 || value > 12) return fallback;
  return value;
}

type DayAllocation = {
  date?: string;
  kind?: string;
  counted?: number;
};

/**
 * Org-wide leave balance matrix for normal active workforce.
 * Ledger Available / Pending stay year-scoped; Used columns + hover details are
 * month-scoped for the selected Month + Year.
 */
export async function listTeamLeaveBalanceRows(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: TeamLeaveBalanceFilters = {},
): Promise<TeamLeaveBalanceResult> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const balanceYear = filters.balanceYear ?? getCurrentBalanceYear();
  const balanceMonth = clampMonth(
    filters.balanceMonth,
    Number.parseInt(today.slice(5, 7), 10),
  );
  const monthRange = getMonthDateRange(balanceMonth, balanceYear);
  const monthLabel = formatLeaveMonthYear(balanceMonth, balanceYear);
  const yearStart = `${balanceYear}-01-01`;
  const yearEnd = `${balanceYear}-12-31`;
  const search = filters.search?.trim() ?? "";

  let employeeQuery = filterAppVisibleEmployees(
    supabase
      .schema("hrms")
      .from("employees")
      .select(
        `
      id,
      employee_code,
      first_name,
      last_name,
      email,
      departments:department_id (name),
      employment_types:employment_type_id (name),
      designations:designation_id (title, code)
    `,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("employment_status", activeEmploymentStatusFilter())
      .order("first_name", { ascending: true })
      .order("last_name", { ascending: true }),
  );

  if (filters.departmentId) {
    employeeQuery = employeeQuery.eq("department_id", filters.departmentId);
  }
  if (filters.employmentTypeId) {
    employeeQuery = employeeQuery.eq("employment_type_id", filters.employmentTypeId);
  }
  if (search) {
    const term = `%${search}%`;
    employeeQuery = employeeQuery.or(
      `first_name.ilike.${term},last_name.ilike.${term},employee_code.ilike.${term},email.ilike.${term}`,
    );
  }

  const [employeesResult, departments, employmentTypes, orgOptionalHolidays] =
    await Promise.all([
      employeeQuery,
      getOccupiedDepartments(supabase, organizationId),
      getEmploymentTypes(supabase, organizationId),
      listOrganizationOptionalHolidays(supabase, organizationId, balanceYear),
    ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message);

  const emptyResult = (): TeamLeaveBalanceResult => ({
    rows: [],
    year: balanceYear,
    month: balanceMonth,
    monthLabel,
    departments,
    employmentTypes,
  });

  const employees = (employeesResult.data ?? [])
    .filter((row) => {
      const designation = unwrapRelation(
        row.designations as
          | { title?: string; code?: string }
          | { title?: string; code?: string }[]
          | null,
      );
      return !isExcludedFromAttendanceWorkforce(row.employee_code as string | null, {
        employeeCode: row.employee_code as string | null,
        firstName: row.first_name as string | null,
        lastName: row.last_name as string | null,
        email: row.email as string | null,
        designationTitle: designation?.title ?? null,
        designationCode: designation?.code ?? null,
      });
    })
    .map((row) => {
      const department = unwrapRelation(
        row.departments as { name?: string } | { name?: string }[] | null,
      );
      const employmentType = unwrapRelation(
        row.employment_types as { name?: string } | { name?: string }[] | null,
      );
      return {
        id: row.id as string,
        employeeCode: String(row.employee_code ?? ""),
        employeeName: formatCleanEmployeeName(
          row.first_name as string | null,
          row.last_name as string | null,
        ),
        departmentName: department?.name ?? null,
        employmentTypeName: employmentType?.name ?? null,
      };
    });

  const employeeIds = employees.map((row) => row.id);
  if (employeeIds.length === 0) {
    return emptyResult();
  }

  const holidayNameByDate = new Map(
    orgOptionalHolidays.map((holiday) => [holiday.date, holiday.name] as const),
  );

  const [balanceRows, requestRows, attendanceRows] = await Promise.all([
    fetchInChunks(employeeIds, async (chunk) => {
      const { data, error } = await supabase
        .schema("hrms")
        .from("leave_balances")
        .select(
          `
          employee_id,
          allocated_days,
          used_days,
          pending_days,
          balance_days,
          leave_types:leave_type_id (code, days_per_year)
        `,
        )
        .in("employee_id", chunk)
        .eq("balance_year", balanceYear)
        .is("deleted_at", null);
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
    fetchInChunks(employeeIds, async (chunk) => {
      const { data, error } = await supabase
        .schema("hrms")
        .from("leave_requests")
        .select(
          `
          employee_id,
          start_date,
          end_date,
          total_days,
          leave_status,
          reason,
          duration_breakdown,
          leave_types:leave_type_id (code, name)
        `,
        )
        .in("employee_id", chunk)
        .in("leave_status", ["approved", "pending"])
        .lte("start_date", yearEnd)
        .gte("end_date", yearStart)
        .is("deleted_at", null);
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
    // Month-scoped attendance only — sheet src:CL/EL/LOP is the consumed-leave
    // source when no leave_request exists (excel import / HR status).
    fetchInChunks(employeeIds, async (chunk) => {
      const { data, error } = await supabase
        .schema("hrms")
        .from("attendance")
        .select("employee_id, attendance_date, notes")
        .in("employee_id", chunk)
        .gte("attendance_date", monthRange.start)
        .lte("attendance_date", monthRange.end)
        .is("deleted_at", null);
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
  ]);

  const balances = balanceRows.map((row) => {
    const leaveType = unwrapRelation(
      row.leave_types as
        | { code?: string; days_per_year?: number | string }
        | { code?: string; days_per_year?: number | string }[]
        | null,
    );
    return {
      employeeId: row.employee_id as string,
      leaveTypeCode: String(leaveType?.code ?? ""),
      balanceDays: Number(row.balance_days ?? 0),
      usedDays: Number(row.used_days ?? 0),
      pendingDays: Number(row.pending_days ?? 0),
      allocatedDays: Number(row.allocated_days ?? 0),
      daysPerYear: Number(leaveType?.days_per_year ?? 0),
    };
  });

  const ohAllocatedByEmployee = new Map<string, number>();
  for (const balance of balances) {
    if (String(balance.leaveTypeCode).toUpperCase() !== OPTIONAL_HOLIDAY_CODE) continue;
    ohAllocatedByEmployee.set(
      balance.employeeId,
      Math.max(
        Number(balance.allocatedDays) || 0,
        Number(balance.daysPerYear) || 0,
        OPTIONAL_HOLIDAY_YEARLY_LIMIT,
      ),
    );
  }

  const yearLopByEmployeeId = new Map<string, number>();
  const monthUsedByEmployeeId = new Map<
    string,
    { cl: number; el: number; oh: number; lop: number }
  >();
  const usageByEmployeeId = new Map<
    string,
    {
      clUsage: TeamLeaveUsageEntry[];
      elUsage: TeamLeaveUsageEntry[];
      ohUsage: TeamLeaveUsageEntry[];
      lopUsage: TeamLeaveUsageEntry[];
    }
  >();
  const requestLopUsageByEmployeeId = new Map<string, TeamLeaveUsageEntry[]>();
  const ohTakenByEmployee = new Map<string, Map<string, "pending" | "approved">>();

  const ensureMonthUsed = (employeeId: string) => {
    let bucket = monthUsedByEmployeeId.get(employeeId);
    if (!bucket) {
      bucket = { cl: 0, el: 0, oh: 0, lop: 0 };
      monthUsedByEmployeeId.set(employeeId, bucket);
    }
    return bucket;
  };

  const ensureUsage = (employeeId: string) => {
    let bucket = usageByEmployeeId.get(employeeId);
    if (!bucket) {
      bucket = { clUsage: [], elUsage: [], ohUsage: [], lopUsage: [] };
      usageByEmployeeId.set(employeeId, bucket);
    }
    return bucket;
  };

  for (const row of requestRows) {
    const leaveType = unwrapRelation(
      row.leave_types as
        | { code?: string; name?: string }
        | { code?: string; name?: string }[]
        | null,
    );
    const code = String(leaveType?.code ?? "").toUpperCase();
    const employeeId = row.employee_id as string;
    const status = String(row.leave_status ?? "");
    const startDate = String(row.start_date).slice(0, 10);
    const endDate = String(row.end_date).slice(0, 10);

    if (status === "approved") {
      const lop = lopDaysFromLeaveRequest({
        total_days: row.total_days as number | string | null,
        duration_breakdown: row.duration_breakdown,
        leaveTypeCode: leaveType?.code ?? null,
      });
      if (lop > 0) {
        yearLopByEmployeeId.set(
          employeeId,
          roundLeaveDays((yearLopByEmployeeId.get(employeeId) ?? 0) + lop),
        );
      }

      // Month-scoped LOP lines from request day allocations (merged with attendance later).
      const breakdown = row.duration_breakdown as {
        dayAllocations?: DayAllocation[];
        lopDays?: unknown;
      } | null;
      const allocations = Array.isArray(breakdown?.dayAllocations)
        ? breakdown.dayAllocations
        : [];
      const requestLopEntries: TeamLeaveUsageEntry[] = [];
      if (allocations.length > 0) {
        for (const day of allocations) {
          const date = String(day.date ?? "").slice(0, 10);
          if (!date || date < monthRange.start || date > monthRange.end) continue;
          if (String(day.kind ?? "").toLowerCase() !== "lop") continue;
          const days = roundLeaveDays(Math.max(0, Number(day.counted ?? 0)));
          if (days <= 0) continue;
          requestLopEntries.push({
            startDate: date,
            endDate: date,
            leaveTypeName: "LOP",
            leaveTypeCode: "LOP",
            days,
            status: "Approved",
            reason: (row.reason as string | null) ?? null,
            holidayName: null,
          });
        }
      } else if (
        lop > 0 &&
        endDate >= monthRange.start &&
        startDate <= monthRange.end &&
        startDate >= monthRange.start &&
        endDate <= monthRange.end
      ) {
        requestLopEntries.push({
          startDate,
          endDate,
          leaveTypeName: "LOP",
          leaveTypeCode: "LOP",
          days: lop,
          status: "Approved",
          reason: (row.reason as string | null) ?? null,
          holidayName: null,
        });
      }
      if (requestLopEntries.length > 0) {
        const existing = requestLopUsageByEmployeeId.get(employeeId) ?? [];
        requestLopUsageByEmployeeId.set(employeeId, [
          ...existing,
          ...requestLopEntries,
        ]);
      }
    }

    if (code === OPTIONAL_HOLIDAY_CODE && (status === "approved" || status === "pending")) {
      let taken = ohTakenByEmployee.get(employeeId);
      if (!taken) {
        taken = new Map();
        ohTakenByEmployee.set(employeeId, taken);
      }
      const nextStatus = status === "approved" ? "approved" : "pending";
      if (taken.get(startDate) !== "approved") {
        taken.set(startDate, nextStatus);
      }
    }

    if (!USAGE_CODES.has(code) || status !== "approved") continue;

    const entries = buildMonthScopedLeaveUsageEntries({
      startDate,
      endDate,
      leaveTypeCode: code,
      leaveTypeName: String(leaveType?.name ?? code),
      status,
      reason: (row.reason as string | null) ?? null,
      totalDays: row.total_days as number | string | null,
      durationBreakdown: row.duration_breakdown,
      monthRange,
      holidayNameByDate,
    });
    if (entries.length === 0) continue;

    const bucket = ensureUsage(employeeId);
    for (const entry of entries) {
      if (code === "CL") {
        bucket.clUsage.push(entry);
      } else if (code === "EL") {
        bucket.elUsage.push(entry);
      } else if (code === "OH") {
        bucket.ohUsage.push(entry);
      }
    }
  }

  // Merge month attendance src:CL / src:EL / src:LOP with request usage (no double-count).
  const attendanceByEmployee = new Map<
    string,
    Array<{ attendance_date?: string | null; notes?: string | null }>
  >();
  for (const row of attendanceRows) {
    const employeeId = row.employee_id as string;
    const list = attendanceByEmployee.get(employeeId) ?? [];
    list.push({
      attendance_date: row.attendance_date as string | null,
      notes: row.notes as string | null,
    });
    attendanceByEmployee.set(employeeId, list);
  }

  for (const employee of employees) {
    const bucket = ensureUsage(employee.id);
    const month = ensureMonthUsed(employee.id);
    const attRows = attendanceByEmployee.get(employee.id) ?? [];
    const leaveDays = listAttendanceLeaveDays(attRows);
    const lopDates = listAttendanceLopDays(attRows);

    bucket.clUsage = mergeMonthScopedLeaveUsageEntries(
      bucket.clUsage,
      usageEntriesFromAttendanceLeaveDays(leaveDays, "CL"),
    );
    bucket.elUsage = mergeMonthScopedLeaveUsageEntries(
      bucket.elUsage,
      usageEntriesFromAttendanceLeaveDays(leaveDays, "EL"),
    );
    bucket.ohUsage = mergeMonthScopedLeaveUsageEntries(
      bucket.ohUsage,
      usageEntriesFromAttendanceLeaveDays(leaveDays, "OH"),
    );
    bucket.lopUsage = mergeMonthScopedLeaveUsageEntries(
      requestLopUsageByEmployeeId.get(employee.id) ?? [],
      usageEntriesFromAttendanceLopDates(lopDates),
    );

    month.cl = sumUsageEntryDays(bucket.clUsage);
    month.el = sumUsageEntryDays(bucket.elUsage);
    month.oh = sumUsageEntryDays(bucket.ohUsage);
    month.lop = sumUsageEntryDays(bucket.lopUsage);
  }

  const ohByEmployeeId = new Map<
    string,
    { allowed: number; used: number; remaining: number }
  >();

  for (const employee of employees) {
    const taken = ohTakenByEmployee.get(employee.id) ?? new Map();
    const yearlyLimit = Math.max(
      ohAllocatedByEmployee.get(employee.id) ?? 0,
      OPTIONAL_HOLIDAY_YEARLY_LIMIT,
    );
    const usedOrPending = taken.size;
    const used = [...taken.values()].filter((value) => value === "approved").length;
    const upcomingAvailable = upcomingOptionalHolidays(orgOptionalHolidays, today).filter(
      (holiday) => !taken.has(holiday.date),
    ).length;
    ohByEmployeeId.set(employee.id, {
      allowed: yearlyLimit,
      used,
      remaining: remainingOptionalHolidayEntitlement({
        yearlyLimit,
        usedOrPending,
        upcomingAvailableDates: upcomingAvailable,
      }),
    });
  }

  const rows = buildTeamLeaveBalanceRows({
    employees,
    balances,
    lopByEmployeeId: yearLopByEmployeeId,
    ohByEmployeeId,
    monthUsedByEmployeeId,
    usageByEmployeeId,
  });

  return {
    rows,
    year: balanceYear,
    month: balanceMonth,
    monthLabel,
    departments,
    employmentTypes,
  };
}

export { buildTeamLeaveBalanceRows } from "@/lib/leave/services/leave-team-balances-matrix";

