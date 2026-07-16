import { format, getDaysInMonth, parseISO, subMonths } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  computeLateMinutes,
  DEFAULT_ATTENDANCE_RULES,
  formatAttendanceTime,
  getTodayDateString,
} from "@/lib/attendance/services/attendance-utils";
import {
  computeMonitoringFlags,
  isWorkFromHomeBranch,
} from "@/lib/manager/services/attendance-correction-service";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import { ceoAttendanceListParamsSchema } from "@/lib/validations/ceo-attendance";
import type { UserProfile } from "@/types/auth";
import type { AttendanceStatus } from "@/types/attendance";
import type {
  CeoAttendanceAnalytics,
  CeoAttendanceCalendarItem,
  CeoAttendanceDepartmentRow,
  CeoAttendanceEmployeeDetail,
  CeoAttendanceEmployeeListResult,
  CeoAttendanceExceptions,
  CeoAttendanceFilterLookups,
  CeoAttendanceKpis,
  CeoAttendanceListParams,
  CeoAttendanceOverview,
  CeoAttendancePageData,
} from "@/types/ceo-attendance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const WORKING_STATUSES: AttendanceStatus[] = ["present", "late", "half_day"];
const ATTENDANCE_TARGET = 85;

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return unwrapRelation(value as T | T[] | null);
}

function parseParams(params: CeoAttendanceListParams) {
  const today = getTodayDateString();
  const now = parseISO(today);
  const parsed = ceoAttendanceListParamsSchema.parse(params);
  const month = parsed.month ?? now.getMonth() + 1;
  const year = parsed.year ?? now.getFullYear();
  const monthStart = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const monthEnd = format(
    new Date(year, month - 1, getDaysInMonth(new Date(year, month - 1, 1))),
    "yyyy-MM-dd",
  );

  return {
    ...parsed,
    month,
    year,
    dateFrom: parsed.dateFrom ?? monthStart,
    dateTo: parsed.dateTo ?? monthEnd,
    monthStart,
    monthEnd,
    today,
  };
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function averageClockTime(timestamps: string[]) {
  if (timestamps.length === 0) return null;
  const minutes = timestamps.map((value) => {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(parseISO(value));
    const [h, m] = formatted.split(":").map(Number);
    return h * 60 + m;
  });
  const mean = Math.round(avg(minutes));
  const hours = Math.floor(mean / 60);
  const mins = mean % 60;
  const iso = `${getTodayDateString()}T${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00+05:30`;
  return formatAttendanceTime(iso);
}

async function loadScopedEmployees(
  supabase: AuthSupabaseClient,
  organizationId: string,
  filters: ReturnType<typeof parseParams>,
) {
  let query = supabase
    .schema("hrms")
    .from("employees")
    .select(
      `id, employee_code, first_name, last_name, email, department_id, designation_id,
      reporting_manager_id, employment_type_id, branch_id, employment_status,
      departments:department_id(id, name, department_head_id),
      designations:designation_id(title),
      managers:reporting_manager_id(first_name, last_name),
      branches:branch_id(id, name),
      employee_profiles(profile_image_storage_path)`,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .in("employment_status", ["active", "probation", "on_leave"]);

  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.managerId) query = query.eq("reporting_manager_id", filters.managerId);
  if (filters.branchId) query = query.eq("branch_id", filters.branchId);
  if (filters.employmentTypeId) {
    query = query.eq("employment_type_id", filters.employmentTypeId);
  }
  if (filters.employeeId) {
    query = query.eq("id", filters.employeeId);
  } else if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `employee_code.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`,
    );
  }

  const { data, error } = await query.order("first_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as LooseRow[];
}

async function loadAttendanceRows(
  supabase: AuthSupabaseClient,
  organizationId: string,
  dateFrom: string,
  dateTo: string,
  employeeIds?: string[],
) {
  let query = fromHrms(supabase, "attendance")
    .select(
      `id, employee_id, branch_id, attendance_date, check_in_at, check_out_at,
      work_hours, overtime_hours, attendance_status, notes,
      branches:branch_id(name)`,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("attendance_date", dateFrom)
    .lte("attendance_date", dateTo);

  if (employeeIds && employeeIds.length > 0) {
    query = query.in("employee_id", employeeIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as LooseRow[];
}

function isWorking(status: AttendanceStatus) {
  return WORKING_STATUSES.includes(status);
}

export async function getCeoAttendanceFilterLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<CeoAttendanceFilterLookups> {
  const [employeesRes, departments, managers, branches, employmentTypes, reporting] =
    await Promise.all([
    fromHrms(supabase, "employees")
      .select("id, first_name, last_name, employee_code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("first_name"),
    fromHrms(supabase, "departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, first_name, last_name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("employment_status", ["active", "probation", "on_leave"]),
    fromHrms(supabase, "branches")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "employment_types")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .schema("hrms")
      .from("employees")
      .select("reporting_manager_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .not("reporting_manager_id", "is", null),
  ]);

  if (departments.error) throw new Error(departments.error.message);
  if (employeesRes.error) throw new Error(employeesRes.error.message);
  if (managers.error) throw new Error(managers.error.message);
  if (branches.error) throw new Error(branches.error.message);
  if (employmentTypes.error) throw new Error(employmentTypes.error.message);
  if (reporting.error) throw new Error(reporting.error.message);

  const managerIds = new Set(
    ((reporting.data ?? []) as LooseRow[])
      .map((row) => row.reporting_manager_id as string)
      .filter(Boolean),
  );

  return {
    employees: ((employeesRes.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: `${row.first_name} ${row.last_name} · ${row.employee_code}`,
    })),
    departments: ((departments.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    managers: ((managers.data ?? []) as LooseRow[])
      .filter((row) => managerIds.has(row.id))
      .map((row) => ({
        id: row.id,
        label: formatEmployeeName(row.first_name, row.last_name),
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    locations: ((branches.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    employmentTypes: ((employmentTypes.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
  };
}

export async function getCeoAttendanceKpis(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoAttendanceListParams = {},
): Promise<CeoAttendanceKpis> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(filters);
  const employees = await loadScopedEmployees(supabase, organizationId, parsed);
  const employeeIds = employees.map((row) => row.id as string);
  const headcount = employeeIds.length;

  if (headcount === 0) {
    return {
      overallAttendancePercent: 0,
      presentToday: 0,
      absentToday: 0,
      onLeaveToday: 0,
      workFromHome: 0,
      lateArrivals: 0,
      earlyCheckouts: 0,
      averageWorkingHours: 0,
      attendanceCompliancePercent: 0,
      overtimeHours: 0,
    };
  }

  const [todayRows, monthRows, leaveRes] = await Promise.all([
    loadAttendanceRows(supabase, organizationId, parsed.today, parsed.today, employeeIds),
    loadAttendanceRows(
      supabase,
      organizationId,
      parsed.monthStart,
      parsed.monthEnd,
      employeeIds,
    ),
    fromHrms(supabase, "leave_requests")
      .select("employee_id")
      .eq("leave_status", "approved")
      .lte("start_date", parsed.today)
      .gte("end_date", parsed.today)
      .in("employee_id", employeeIds)
      .is("deleted_at", null),
  ]);

  if (leaveRes.error) throw new Error(leaveRes.error.message);

  let rows = todayRows;
  if (parsed.attendanceStatus) {
    rows = rows.filter((row) => row.attendance_status === parsed.attendanceStatus);
  }
  if (parsed.branchId) {
    rows = rows.filter((row) => row.branch_id === parsed.branchId);
  }

  const presentToday = rows.filter((row) => row.attendance_status === "present").length;
  const lateArrivals = rows.filter((row) => row.attendance_status === "late").length;
  const absentToday = rows.filter((row) => row.attendance_status === "absent").length;
  const onLeaveAttendance = rows.filter((row) => row.attendance_status === "on_leave").length;
  const leaveEmployees = new Set(
    ((leaveRes.data ?? []) as LooseRow[]).map((row) => row.employee_id as string),
  );
  for (const row of rows) {
    if (row.attendance_status === "on_leave") leaveEmployees.add(row.employee_id);
  }

  const workFromHome = rows.filter((row) => {
    const branch = unwrap(row.branches);
    return (
      isWorking(row.attendance_status as AttendanceStatus) &&
      isWorkFromHomeBranch(branch?.name, row.notes)
    );
  }).length;

  let earlyCheckouts = 0;
  let compliant = 0;
  const workingToday = rows.filter((row) =>
    isWorking(row.attendance_status as AttendanceStatus),
  );

  for (const row of workingToday) {
    const lateMinutes = computeLateMinutes(
      row.check_in_at,
      row.attendance_date,
      DEFAULT_ATTENDANCE_RULES.lateAfter,
    );
    const flags = computeMonitoringFlags(
      row.attendance_status as AttendanceStatus,
      row.check_in_at,
      row.check_out_at,
      lateMinutes,
      row.attendance_date,
    );
    if (flags.isEarlyExit) earlyCheckouts += 1;
    if (!flags.isLate && !flags.isEarlyExit && !flags.missingCheckOut) compliant += 1;
  }

  const overallWorking = monthRows.filter((row) =>
    isWorking(row.attendance_status as AttendanceStatus),
  );
  const overallAttendancePercent = percent(overallWorking.length, monthRows.length || headcount);
  const averageWorkingHours = avg(
    workingToday.map((row) => Number(row.work_hours ?? 0)).filter((value) => value > 0),
  );
  const overtimeHours = Math.round(
    monthRows.reduce((sum, row) => sum + Number(row.overtime_hours ?? 0), 0) * 10,
  ) / 10;

  return {
    overallAttendancePercent,
    presentToday: presentToday + rows.filter((row) => row.attendance_status === "half_day").length,
    absentToday,
    onLeaveToday: Math.max(onLeaveAttendance, leaveEmployees.size),
    workFromHome,
    lateArrivals,
    earlyCheckouts,
    averageWorkingHours,
    attendanceCompliancePercent: percent(compliant, workingToday.length || 1),
    overtimeHours,
  };
}

export async function getCeoAttendanceOverview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoAttendanceListParams = {},
): Promise<CeoAttendanceOverview> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(filters);
  const employees = await loadScopedEmployees(supabase, organizationId, parsed);
  const employeeIds = employees.map((row) => row.id as string);

  const yearStart = `${parsed.year}-01-01`;
  const yearEnd = `${parsed.year}-12-31`;
  const months = Array.from({ length: 6 }, (_, index) =>
    subMonths(new Date(parsed.year, parsed.month - 1, 1), 5 - index),
  );

  const [monthRows, yearRows, todayRows] = await Promise.all([
    employeeIds.length
      ? loadAttendanceRows(
          supabase,
          organizationId,
          parsed.monthStart,
          parsed.monthEnd,
          employeeIds,
        )
      : Promise.resolve([]),
    employeeIds.length
      ? loadAttendanceRows(supabase, organizationId, yearStart, yearEnd, employeeIds)
      : Promise.resolve([]),
    employeeIds.length
      ? loadAttendanceRows(supabase, organizationId, parsed.today, parsed.today, employeeIds)
      : Promise.resolve([]),
  ]);

  const monthWorking = monthRows.filter((row) =>
    isWorking(row.attendance_status as AttendanceStatus),
  );
  const yearWorking = yearRows.filter((row) =>
    isWorking(row.attendance_status as AttendanceStatus),
  );

  const attendanceTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    const rows = yearRows.filter((row) => String(row.attendance_date).startsWith(key));
    const working = rows.filter((row) => isWorking(row.attendance_status as AttendanceStatus));
    return {
      label: format(date, "MMM yyyy"),
      value: percent(working.length, rows.length || 1),
    };
  });

  const checkIns = todayRows
    .map((row) => row.check_in_at as string | null)
    .filter((value): value is string => Boolean(value));
  const checkOuts = todayRows
    .map((row) => row.check_out_at as string | null)
    .filter((value): value is string => Boolean(value));

  const todayWorking = todayRows.filter((row) =>
    isWorking(row.attendance_status as AttendanceStatus),
  );

  return {
    overallAttendancePercent: percent(todayWorking.length, employeeIds.length || 1),
    monthlyAttendancePercent: percent(
      monthWorking.length,
      monthRows.length || employeeIds.length || 1,
    ),
    yearlyAttendancePercent: percent(
      yearWorking.length,
      yearRows.length || employeeIds.length || 1,
    ),
    attendanceTrend,
    averageCheckInTime: averageClockTime(checkIns),
    averageCheckOutTime: averageClockTime(checkOuts),
    averageWorkingHours: avg(
      todayRows
        .map((row) => Number(row.work_hours ?? 0))
        .filter((value) => value > 0),
    ),
  };
}

export async function listCeoAttendanceDepartments(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoAttendanceListParams = {},
): Promise<CeoAttendanceDepartmentRow[]> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(filters);
  const employees = await loadScopedEmployees(supabase, organizationId, parsed);
  const employeeIds = employees.map((row) => row.id as string);

  const { data: departments, error } = await fromHrms(supabase, "departments")
    .select(
      "id, name, department_head_id, department_head:department_head_id(first_name, last_name)",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");
  if (error) throw new Error(error.message);

  const todayRows = employeeIds.length
    ? await loadAttendanceRows(
        supabase,
        organizationId,
        parsed.today,
        parsed.today,
        employeeIds,
      )
    : [];

  return ((departments.data ?? []) as LooseRow[])
    .filter((row) => !parsed.departmentId || row.id === parsed.departmentId)
    .map((row) => {
      const deptEmployees = employees.filter((emp) => emp.department_id === row.id);
      const ids = new Set(deptEmployees.map((emp) => emp.id as string));
      const rows = todayRows.filter((item) => ids.has(item.employee_id));
      const headcount = deptEmployees.length || 1;
      const present = rows.filter((item) =>
        isWorking(item.attendance_status as AttendanceStatus),
      ).length;
      const late = rows.filter((item) => item.attendance_status === "late").length;
      const absent = rows.filter((item) => item.attendance_status === "absent").length;
      const leave = rows.filter((item) => item.attendance_status === "on_leave").length;
      const hours = avg(
        rows.map((item) => Number(item.work_hours ?? 0)).filter((value) => value > 0),
      );
      const presentPercent = percent(present, headcount);
      const latePercent = percent(late, headcount);
      const absentPercent = percent(absent, headcount);
      const leavePercent = percent(leave, headcount);
      const attendanceScore = Math.max(
        0,
        Math.round(presentPercent - latePercent * 0.5 - absentPercent),
      );
      const head = unwrap(row.department_head);

      return {
        id: row.id as string,
        name: row.name as string,
        headName: head ? formatEmployeeName(head.first_name, head.last_name) : null,
        employeeCount: deptEmployees.length,
        presentPercent,
        latePercent,
        absentPercent,
        leavePercent,
        averageWorkingHours: hours,
        attendanceScore,
      };
    })
    .filter((row) => row.employeeCount > 0);
}

export async function listCeoAttendanceEmployees(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoAttendanceListParams,
): Promise<CeoAttendanceEmployeeListResult> {
  const parsed = parseParams(params);
  const organizationId = profile.employee.organizationId;
  const employees = await loadScopedEmployees(supabase, organizationId, parsed);
  const employeeIds = employees.map((row) => row.id as string);

  if (employeeIds.length === 0) {
    return { data: [], total: 0, page: parsed.page, pageSize: parsed.pageSize };
  }

  const [todayRows, monthRows] = await Promise.all([
    loadAttendanceRows(supabase, organizationId, parsed.today, parsed.today, employeeIds),
    loadAttendanceRows(
      supabase,
      organizationId,
      parsed.monthStart,
      parsed.monthEnd,
      employeeIds,
    ),
  ]);

  const todayByEmployee = new Map<string, LooseRow>();
  for (const row of todayRows) todayByEmployee.set(row.employee_id, row);

  let mapped = employees.map((employee) => {
    const today = todayByEmployee.get(employee.id) ?? null;
    const status = (today?.attendance_status as AttendanceStatus | undefined) ?? "no_record";
    const lateMinutes = today
      ? computeLateMinutes(
          today.check_in_at,
          today.attendance_date,
          DEFAULT_ATTENDANCE_RULES.lateAfter,
        )
      : 0;
    const employeeMonth = monthRows.filter((row) => row.employee_id === employee.id);
    const working = employeeMonth.filter((row) =>
      isWorking(row.attendance_status as AttendanceStatus),
    );
    const manager = unwrap(employee.managers);
    const department = unwrap(employee.departments);
    const profileRow = unwrap(employee.employee_profiles);

    return {
      id: employee.id as string,
      attendanceId: today?.id ?? null,
      employeeId: employee.id as string,
      employeeCode: employee.employee_code as string,
      firstName: employee.first_name as string,
      lastName: employee.last_name as string,
      fullName: formatEmployeeName(employee.first_name, employee.last_name),
      departmentName: department?.name ?? null,
      managerName: manager
        ? formatEmployeeName(manager.first_name, manager.last_name)
        : null,
      todayStatus: status as AttendanceStatus | "no_record",
      checkInAt: today?.check_in_at ?? null,
      checkOutAt: today?.check_out_at ?? null,
      workingHours: Number(today?.work_hours ?? 0),
      lateMinutes,
      attendancePercent: percent(working.length, employeeMonth.length || 1),
      profileImagePath: profileRow?.profile_image_storage_path ?? null,
    };
  });

  if (parsed.attendanceStatus) {
    mapped = mapped.filter((row) => row.todayStatus === parsed.attendanceStatus);
  }

  const total = mapped.length;
  const from = (parsed.page - 1) * parsed.pageSize;
  return {
    data: mapped.slice(from, from + parsed.pageSize),
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export async function getCeoAttendanceAnalytics(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoAttendanceListParams = {},
): Promise<CeoAttendanceAnalytics> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(filters);
  const employees = await loadScopedEmployees(supabase, organizationId, parsed);
  const employeeIds = employees.map((row) => row.id as string);
  const departments = await listCeoAttendanceDepartments(supabase, profile, parsed);

  const months = Array.from({ length: 6 }, (_, index) =>
    subMonths(new Date(parsed.year, parsed.month - 1, 1), 5 - index),
  );
  const rangeStart = format(months[0]!, "yyyy-MM-dd");
  const yearStart = `${parsed.year - 2}-01-01`;

  const [rangeRows, yearRows, monthRows] = await Promise.all([
    employeeIds.length
      ? loadAttendanceRows(supabase, organizationId, rangeStart, parsed.monthEnd, employeeIds)
      : Promise.resolve([]),
    employeeIds.length
      ? loadAttendanceRows(
          supabase,
          organizationId,
          yearStart,
          `${parsed.year}-12-31`,
          employeeIds,
        )
      : Promise.resolve([]),
    employeeIds.length
      ? loadAttendanceRows(
          supabase,
          organizationId,
          parsed.monthStart,
          parsed.monthEnd,
          employeeIds,
        )
      : Promise.resolve([]),
  ]);

  const attendanceTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    const rows = rangeRows.filter((row) => String(row.attendance_date).startsWith(key));
    const working = rows.filter((row) => isWorking(row.attendance_status as AttendanceStatus));
    return { label: format(date, "MMM yyyy"), value: percent(working.length, rows.length || 1) };
  });

  const lateArrivalTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    const rows = rangeRows.filter((row) => String(row.attendance_date).startsWith(key));
    return {
      label: format(date, "MMM yyyy"),
      value: rows.filter((row) => row.attendance_status === "late").length,
    };
  });

  const wfhTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    const rows = rangeRows.filter((row) => String(row.attendance_date).startsWith(key));
    return {
      label: format(date, "MMM yyyy"),
      value: rows.filter((row) => {
        const branch = unwrap(row.branches);
        return (
          isWorking(row.attendance_status as AttendanceStatus) &&
          isWorkFromHomeBranch(branch?.name, row.notes)
        );
      }).length,
    };
  });

  const leaveTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    const rows = rangeRows.filter((row) => String(row.attendance_date).startsWith(key));
    return {
      label: format(date, "MMM yyyy"),
      value: rows.filter((row) => row.attendance_status === "on_leave").length,
    };
  });

  const overtimeTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    const rows = rangeRows.filter((row) => String(row.attendance_date).startsWith(key));
    return {
      label: format(date, "MMM yyyy"),
      value:
        Math.round(
          rows.reduce((sum, row) => sum + Number(row.overtime_hours ?? 0), 0) * 10,
        ) / 10,
    };
  });

  const monthlyComparison = Array.from({ length: 12 }, (_, index) => {
    const key = `${parsed.year}-${String(index + 1).padStart(2, "0")}`;
    const rows = yearRows.filter((row) => String(row.attendance_date).startsWith(key));
    const working = rows.filter((row) => isWorking(row.attendance_status as AttendanceStatus));
    return {
      label: format(new Date(parsed.year, index, 1), "MMM"),
      value: percent(working.length, rows.length || 1),
    };
  });

  const yearlyComparison = [parsed.year - 2, parsed.year - 1, parsed.year].map((year) => {
    const rows = yearRows.filter((row) => String(row.attendance_date).startsWith(String(year)));
    const working = rows.filter((row) => isWorking(row.attendance_status as AttendanceStatus));
    return {
      label: String(year),
      value: percent(working.length, rows.length || 1),
    };
  });

  const dayMap = new Map<string, { working: number; total: number }>();
  for (const row of monthRows) {
    const day = String(row.attendance_date).slice(8, 10);
    const existing = dayMap.get(day) ?? { working: 0, total: 0 };
    existing.total += 1;
    if (isWorking(row.attendance_status as AttendanceStatus)) existing.working += 1;
    dayMap.set(day, existing);
  }

  const attendanceHeatmap = [...dayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, stats]) => ({
      label,
      value: percent(stats.working, stats.total || 1),
    }));

  const weekdayMap = new Map<string, number[]>();
  for (const row of monthRows) {
    if (!isWorking(row.attendance_status as AttendanceStatus)) continue;
    const weekday = format(parseISO(row.attendance_date), "EEE");
    const list = weekdayMap.get(weekday) ?? [];
    list.push(1);
    weekdayMap.set(weekday, list);
  }

  const peakAttendanceDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    .map((label) => ({
      label,
      value: weekdayMap.get(label)?.length ?? 0,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  return {
    attendanceTrend,
    departmentComparison: departments
      .map((row) => ({ label: row.name, value: row.presentPercent }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    monthlyComparison,
    yearlyComparison,
    lateArrivalTrend,
    wfhTrend,
    leaveTrend,
    overtimeTrend,
    attendanceHeatmap,
    peakAttendanceDays,
  };
}

export async function getCeoAttendanceExceptions(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoAttendanceListParams = {},
): Promise<CeoAttendanceExceptions> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(filters);
  const employees = await loadScopedEmployees(supabase, organizationId, parsed);
  const employeeIds = employees.map((row) => row.id as string);
  const departments = await listCeoAttendanceDepartments(supabase, profile, parsed);

  const [monthRows, todayRows] = await Promise.all([
    employeeIds.length
      ? loadAttendanceRows(
          supabase,
          organizationId,
          parsed.monthStart,
          parsed.monthEnd,
          employeeIds,
        )
      : Promise.resolve([]),
    employeeIds.length
      ? loadAttendanceRows(supabase, organizationId, parsed.today, parsed.today, employeeIds)
      : Promise.resolve([]),
  ]);

  const employeeById = new Map(employees.map((row) => [row.id as string, row]));

  const lateCounts = new Map<string, number>();
  const otHours = new Map<string, number>();
  const attendanceCounts = new Map<string, { working: number; total: number }>();

  for (const row of monthRows) {
    const stats = attendanceCounts.get(row.employee_id) ?? { working: 0, total: 0 };
    stats.total += 1;
    if (isWorking(row.attendance_status as AttendanceStatus)) stats.working += 1;
    attendanceCounts.set(row.employee_id, stats);

    if (row.attendance_status === "late") {
      lateCounts.set(row.employee_id, (lateCounts.get(row.employee_id) ?? 0) + 1);
    }
    otHours.set(
      row.employee_id,
      (otHours.get(row.employee_id) ?? 0) + Number(row.overtime_hours ?? 0),
    );
  }

  const frequentlyLate = [...lateCounts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => {
      const employee = employeeById.get(id);
      return {
        id,
        label: employee
          ? formatEmployeeName(employee.first_name, employee.last_name)
          : id,
        meta: `${count} late days`,
      };
    });

  const missingCheckOuts = todayRows
    .filter((row) => {
      const lateMinutes = computeLateMinutes(
        row.check_in_at,
        row.attendance_date,
        DEFAULT_ATTENDANCE_RULES.lateAfter,
      );
      return computeMonitoringFlags(
        row.attendance_status as AttendanceStatus,
        row.check_in_at,
        row.check_out_at,
        lateMinutes,
        row.attendance_date,
      ).missingCheckOut;
    })
    .slice(0, 8)
    .map((row) => {
      const employee = employeeById.get(row.employee_id);
      return {
        id: row.employee_id as string,
        label: employee
          ? formatEmployeeName(employee.first_name, employee.last_name)
          : row.employee_id,
        meta: "Missing check-out",
      };
    });

  const anomalies = todayRows
    .filter((row) => {
      const lateMinutes = computeLateMinutes(
        row.check_in_at,
        row.attendance_date,
        DEFAULT_ATTENDANCE_RULES.lateAfter,
      );
      const flags = computeMonitoringFlags(
        row.attendance_status as AttendanceStatus,
        row.check_in_at,
        row.check_out_at,
        lateMinutes,
        row.attendance_date,
      );
      return flags.isEarlyExit || flags.missingCheckIn || flags.missingCheckOut;
    })
    .slice(0, 8)
    .map((row) => {
      const employee = employeeById.get(row.employee_id);
      const lateMinutes = computeLateMinutes(
        row.check_in_at,
        row.attendance_date,
        DEFAULT_ATTENDANCE_RULES.lateAfter,
      );
      const flags = computeMonitoringFlags(
        row.attendance_status as AttendanceStatus,
        row.check_in_at,
        row.check_out_at,
        lateMinutes,
        row.attendance_date,
      );
      const reasons = [
        flags.isEarlyExit ? "Early exit" : null,
        flags.missingCheckIn ? "Missing check-in" : null,
        flags.missingCheckOut ? "Missing check-out" : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        id: row.employee_id as string,
        label: employee
          ? formatEmployeeName(employee.first_name, employee.last_name)
          : row.employee_id,
        meta: reasons || "Anomaly",
      };
    });

  const highOvertime = [...otHours.entries()]
    .filter(([, hours]) => hours >= 10)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, hours]) => {
      const employee = employeeById.get(id);
      return {
        id,
        label: employee
          ? formatEmployeeName(employee.first_name, employee.last_name)
          : id,
        meta: `${Math.round(hours * 10) / 10} OT hrs`,
      };
    });

  const lowAttendance = [...attendanceCounts.entries()]
    .map(([id, stats]) => ({
      id,
      rate: percent(stats.working, stats.total || 1),
    }))
    .filter((item) => item.rate > 0 && item.rate < ATTENDANCE_TARGET)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 8)
    .map((item) => {
      const employee = employeeById.get(item.id);
      return {
        id: item.id,
        label: employee
          ? formatEmployeeName(employee.first_name, employee.last_name)
          : item.id,
        meta: `${item.rate}% attendance`,
      };
    });

  return {
    frequentlyLate,
    departmentsBelowTarget: departments
      .filter((row) => row.presentPercent < ATTENDANCE_TARGET)
      .map((row) => ({
        id: row.id,
        label: row.name,
        value: row.presentPercent,
      })),
    missingCheckOuts,
    anomalies,
    highOvertime,
    lowAttendance,
  };
}

export async function getCeoAttendanceCalendar(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoAttendanceListParams = {},
): Promise<CeoAttendanceCalendarItem[]> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(filters);

  const { data: holidays, error } = await fromHrms(supabase, "holidays")
    .select(
      "id, name, holiday_date, holiday_type, is_optional, applicable_department_ids, description",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("holiday_date", parsed.monthStart)
    .lte("holiday_date", parsed.monthEnd)
    .order("holiday_date");

  if (error) throw new Error(error.message);

  const items: CeoAttendanceCalendarItem[] = [];

  for (const row of (holidays.data ?? []) as LooseRow[]) {
    const deptIds = (row.applicable_department_ids ?? []) as string[];
    if (parsed.departmentId && deptIds.length > 0 && !deptIds.includes(parsed.departmentId)) {
      continue;
    }

    if (deptIds.length > 0) {
      items.push({
        id: `shutdown-${row.id}`,
        date: row.holiday_date,
        title: row.name,
        type: "department_shutdown",
        meta: row.description ?? "Department-specific holiday",
      });
    } else if (row.holiday_type === "company") {
      items.push({
        id: `event-${row.id}`,
        date: row.holiday_date,
        title: row.name,
        type: "company_event",
        meta: row.description ?? "Company holiday",
      });
    } else {
      items.push({
        id: `holiday-${row.id}`,
        date: row.holiday_date,
        title: row.name,
        type: "holiday",
        meta: row.is_optional ? "Optional holiday" : row.holiday_type ?? "Public holiday",
      });
    }
  }

  const daysInMonth = getDaysInMonth(new Date(parsed.year, parsed.month - 1, 1));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(parsed.year, parsed.month - 1, day);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) {
      items.push({
        id: `weekend-${format(date, "yyyy-MM-dd")}`,
        date: format(date, "yyyy-MM-dd"),
        title: weekday === 0 ? "Sunday" : "Saturday",
        type: "weekend",
        meta: "Weekend",
      });
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCeoAttendanceEmployeeDetail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: { employeeId: string; month?: number; year?: number },
): Promise<CeoAttendanceEmployeeDetail | null> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const now = parseISO(today);
  const month = input.month ?? now.getMonth() + 1;
  const year = input.year ?? now.getFullYear();
  const monthStart = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const monthEnd = format(
    new Date(year, month - 1, getDaysInMonth(new Date(year, month - 1, 1))),
    "yyyy-MM-dd",
  );
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const { data: employee, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `id, employee_code, first_name, last_name, email,
      departments:department_id(name),
      designations:designation_id(title),
      managers:reporting_manager_id(first_name, last_name),
      employee_profiles(profile_image_storage_path)`,
    )
    .eq("id", input.employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!employee) return null;

  const [monthRows, yearRows] = await Promise.all([
    loadAttendanceRows(supabase, organizationId, monthStart, monthEnd, [input.employeeId]),
    loadAttendanceRows(supabase, organizationId, yearStart, yearEnd, [input.employeeId]),
  ]);

  const presentDays = monthRows.filter((row) => row.attendance_status === "present").length;
  const absentDays = monthRows.filter((row) => row.attendance_status === "absent").length;
  const lateDays = monthRows.filter((row) => row.attendance_status === "late").length;
  const leaveDays = monthRows.filter((row) => row.attendance_status === "on_leave").length;
  const wfhDays = monthRows.filter((row) => {
    const branch = unwrap(row.branches);
    return (
      isWorking(row.attendance_status as AttendanceStatus) &&
      isWorkFromHomeBranch(branch?.name, row.notes)
    );
  }).length;

  const monthWorking = monthRows.filter((row) =>
    isWorking(row.attendance_status as AttendanceStatus),
  );
  const yearWorking = yearRows.filter((row) =>
    isWorking(row.attendance_status as AttendanceStatus),
  );

  const lateRecords = monthRows
    .filter((row) => row.attendance_status === "late" || row.check_in_at)
    .map((row) => ({
      date: row.attendance_date as string,
      lateMinutes: computeLateMinutes(
        row.check_in_at,
        row.attendance_date,
        DEFAULT_ATTENDANCE_RULES.lateAfter,
      ),
      checkInAt: row.check_in_at as string | null,
    }))
    .filter((row) => row.lateMinutes > 0)
    .slice(0, 12);

  const months = Array.from({ length: 6 }, (_, index) =>
    subMonths(new Date(year, month - 1, 1), 5 - index),
  );
  const attendanceTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    const rows = yearRows.filter((row) => String(row.attendance_date).startsWith(key));
    const working = rows.filter((row) => isWorking(row.attendance_status as AttendanceStatus));
    return {
      label: format(date, "MMM"),
      value: percent(working.length, rows.length || 1),
    };
  });

  const department = unwrap(employee.departments);
  const designation = unwrap(employee.designations);
  const manager = unwrap(employee.managers);
  const profileRow = unwrap(employee.employee_profiles);

  return {
    employeeId: employee.id,
    employeeCode: employee.employee_code,
    firstName: employee.first_name,
    lastName: employee.last_name,
    fullName: formatEmployeeName(employee.first_name, employee.last_name),
    email: employee.email,
    departmentName: department?.name ?? null,
    designationTitle: designation?.title ?? null,
    managerName: manager
      ? formatEmployeeName(manager.first_name, manager.last_name)
      : null,
    profileImagePath: profileRow?.profile_image_storage_path ?? null,
    attendanceSummary: {
      presentDays,
      absentDays,
      lateDays,
      leaveDays,
      wfhDays,
      averageHours: avg(
        monthRows.map((row) => Number(row.work_hours ?? 0)).filter((value) => value > 0),
      ),
    },
    monthlyAttendancePercent: percent(monthWorking.length, monthRows.length || 1),
    yearlyAttendancePercent: percent(yearWorking.length, yearRows.length || 1),
    lateRecords,
    leaveSummary: {
      present: presentDays + lateDays,
      leave: leaveDays,
      absent: absentDays,
    },
    overtimeHours:
      Math.round(
        monthRows.reduce((sum, row) => sum + Number(row.overtime_hours ?? 0), 0) * 10,
      ) / 10,
    attendanceTrend,
    recentAttendance: [...monthRows]
      .sort((a, b) => String(b.attendance_date).localeCompare(String(a.attendance_date)))
      .slice(0, 14)
      .map((row) => ({
        id: row.id as string,
        date: row.attendance_date as string,
        status: row.attendance_status as AttendanceStatus,
        checkInAt: row.check_in_at as string | null,
        checkOutAt: row.check_out_at as string | null,
        workHours: Number(row.work_hours ?? 0),
      })),
  };
}

export async function getCeoAttendancePageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoAttendanceListParams,
): Promise<CeoAttendancePageData> {
  const parsed = parseParams(params);
  const organizationId = profile.employee.organizationId;

  const [kpis, overview, departments, employees, analytics, exceptions, calendar, lookups] =
    await Promise.all([
      getCeoAttendanceKpis(supabase, profile, parsed),
      getCeoAttendanceOverview(supabase, profile, parsed),
      listCeoAttendanceDepartments(supabase, profile, parsed),
      listCeoAttendanceEmployees(supabase, profile, parsed),
      getCeoAttendanceAnalytics(supabase, profile, parsed),
      getCeoAttendanceExceptions(supabase, profile, parsed),
      getCeoAttendanceCalendar(supabase, profile, parsed),
      getCeoAttendanceFilterLookups(supabase, organizationId),
    ]);

  return {
    kpis,
    overview,
    departments,
    employees,
    analytics,
    exceptions,
    calendar,
    lookups,
  };
}
