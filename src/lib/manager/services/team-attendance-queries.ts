import { format, lastDayOfMonth, parseISO } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getOrganizationAttendanceRules } from "@/lib/attendance/services/attendance-detail";
import {
  computeLateMinutes,
  getTodayDateString,
} from "@/lib/attendance/services/attendance-utils";
import {
  computeMonitoringFlags,
  getDefaultBreakMinutes,
  isWorkFromHomeBranch,
} from "@/lib/manager/services/attendance-correction-service";
import { getTeamFilterLookups, getTeamMemberOptions } from "@/lib/manager/services/team-queries";
import { teamAttendanceListParamsSchema } from "@/lib/validations/manager-attendance";
import type { UserProfile } from "@/types/auth";
import type { AttendanceStatus } from "@/types/attendance";
import type {
  ManagerTeamAttendancePageData,
  TeamAttendanceListParams,
  TeamAttendanceListResult,
  TeamAttendanceSummary,
  TeamMonthlyAttendanceRow,
} from "@/types/manager-attendance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseParams(params: TeamAttendanceListParams) {
  return teamAttendanceListParamsSchema.parse(params);
}

export async function getTeamAttendanceSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  dateFrom?: string,
  dateTo?: string,
): Promise<TeamAttendanceSummary> {
  const today = getTodayDateString();
  const fromDate = dateFrom ?? today;
  const toDate = dateTo ?? fromDate;
  const organizationId = profile.employee.organizationId;

  if (teamIds.length === 0) {
    return {
      dateLabel: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`,
      presentToday: 0,
      absentToday: 0,
      lateToday: 0,
      halfDayToday: 0,
      workFromHomeToday: 0,
      pendingRegularizations: 0,
    };
  }

  const [attendanceResult, correctionsResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("attendance")
      .select("employee_id, attendance_status, notes, branches:branch_id (name)")
      .eq("organization_id", organizationId)
      .in("employee_id", teamIds)
      .gte("attendance_date", fromDate)
      .lte("attendance_date", toDate)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("attendance_corrections")
      .select("id", { count: "exact", head: true })
      .in("employee_id", teamIds)
      .eq("correction_status", "pending")
      .is("deleted_at", null),
  ]);

  if (attendanceResult.error) throw new Error(attendanceResult.error.message);
  if (correctionsResult.error) throw new Error(correctionsResult.error.message);

  let presentToday = 0;
  let absentToday = 0;
  let lateToday = 0;
  let halfDayToday = 0;
  let workFromHomeToday = 0;

  for (const row of attendanceResult.data ?? []) {
    switch (row.attendance_status as AttendanceStatus) {
      case "present":
        presentToday += 1;
        break;
      case "absent":
        absentToday += 1;
        break;
      case "late":
        lateToday += 1;
        break;
      case "half_day":
        halfDayToday += 1;
        break;
      default:
        break;
    }

    const branch = unwrap(row.branches);
    if (isWorkFromHomeBranch(branch?.name, row.notes)) {
      workFromHomeToday += 1;
    }
  }

  return {
    dateLabel: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`,
    presentToday,
    absentToday,
    lateToday,
    halfDayToday,
    workFromHomeToday,
    pendingRegularizations: correctionsResult.count ?? 0,
  };
}

export async function listTeamAttendance(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  params: TeamAttendanceListParams,
): Promise<TeamAttendanceListResult> {
  const parsed = parseParams(params);

  if (teamIds.length === 0) {
    return { data: [], total: 0, page: parsed.page, pageSize: parsed.pageSize };
  }

  const organizationId = profile.employee.organizationId;
  const rules = await getOrganizationAttendanceRules(supabase, organizationId);
  const breakMinutes = await getDefaultBreakMinutes(supabase, organizationId);
  const from = (parsed.page - 1) * parsed.pageSize;
  const to = from + parsed.pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("attendance")
    .select(
      `
        id,
        branch_id,
        employee_id,
        attendance_date,
        check_in_at,
        check_out_at,
        work_hours,
        overtime_hours,
        attendance_status,
        notes,
        branches:branch_id (name),
        employees!inner (
          employee_code,
          first_name,
          last_name,
          department_id,
          designation_id,
          employment_type_id,
          departments:department_id (name),
          designations:designation_id (title),
          employment_types:employment_type_id (name)
        )
      `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .in("employee_id", teamIds)
    .is("deleted_at", null);

  if (parsed.dateFrom) query = query.gte("attendance_date", parsed.dateFrom);
  if (parsed.dateTo) query = query.lte("attendance_date", parsed.dateTo);
  if (parsed.departmentId) query = query.eq("employees.department_id", parsed.departmentId);
  if (parsed.employmentTypeId) {
    query = query.eq("employees.employment_type_id", parsed.employmentTypeId);
  }
  if (parsed.attendanceStatus) query = query.eq("attendance_status", parsed.attendanceStatus);
  if (parsed.employeeId) query = query.eq("employee_id", parsed.employeeId);

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

  query = query.order("attendance_date", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];
  const attendanceIds = rows.map((row) => row.id as string);

  const correctionsResult = attendanceIds.length
    ? await supabase
        .schema("hrms")
        .from("attendance_corrections")
        .select("id, attendance_id, correction_status")
        .in("attendance_id", attendanceIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (correctionsResult.error) throw new Error(correctionsResult.error.message);

  const correctionByAttendance = new Map<string, { id: string; status: string }>();
  for (const row of correctionsResult.data ?? []) {
    if (!correctionByAttendance.has(row.attendance_id)) {
      correctionByAttendance.set(row.attendance_id, {
        id: row.id,
        status: row.correction_status,
      });
    }
  }

  return {
    data: rows.map((row) => {
      const employee = unwrap(row.employees);
      const branch = unwrap(row.branches);
      const department = unwrap(employee?.departments ?? null);
      const designation = unwrap(employee?.designations ?? null);
      const employmentType = unwrap(employee?.employment_types ?? null);
      const attendanceStatus = row.attendance_status as AttendanceStatus;
      const lateMinutes = computeLateMinutes(
        row.check_in_at,
        row.attendance_date,
        rules.lateAfter,
      );
      const correction = correctionByAttendance.get(row.id);

      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? "",
        employeeName: employee
          ? `${employee.first_name} ${employee.last_name}`
          : "",
        departmentId: employee?.department_id ?? null,
        departmentName: department?.name ?? null,
        designationId: employee?.designation_id ?? null,
        designationTitle: designation?.title ?? null,
        branchId: row.branch_id,
        branchName: branch?.name ?? null,
        employmentTypeName: employmentType?.name ?? null,
        attendanceDate: row.attendance_date,
        checkInAt: row.check_in_at,
        checkOutAt: row.check_out_at,
        workHours: Number(row.work_hours ?? 0),
        breakMinutes,
        overtimeHours: Number(row.overtime_hours ?? 0),
        attendanceStatus,
        lateMinutes,
        correctionId: correction?.id ?? null,
        correctionStatus: (correction?.status as TeamAttendanceListResult["data"][number]["correctionStatus"]) ?? null,
        monitoring: computeMonitoringFlags(
          attendanceStatus,
          row.check_in_at,
          row.check_out_at,
          lateMinutes,
          row.attendance_date,
        ),
        isWorkFromHome: isWorkFromHomeBranch(branch?.name, row.notes),
      };
    }),
    total: count ?? 0,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export async function getTeamMonthlyAttendanceSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  month?: number,
  year?: number,
): Promise<TeamMonthlyAttendanceRow[]> {
  if (teamIds.length === 0) return [];

  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();
  const monthStart = format(new Date(targetYear, targetMonth - 1, 1), "yyyy-MM-dd");
  const monthEnd = format(lastDayOfMonth(parseISO(monthStart)), "yyyy-MM-dd");
  const organizationId = profile.employee.organizationId;

  const { data: employees, error: employeesError } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        id,
        employee_code,
        first_name,
        last_name,
        departments:department_id (name)
      `,
    )
    .eq("organization_id", organizationId)
    .in("id", teamIds)
    .is("deleted_at", null)
    .order("first_name");

  if (employeesError) throw new Error(employeesError.message);

  const { data: attendanceRows, error: attendanceError } = await supabase
    .schema("hrms")
    .from("attendance")
    .select("employee_id, attendance_status, work_hours, notes, branches:branch_id (name)")
    .eq("organization_id", organizationId)
    .in("employee_id", teamIds)
    .gte("attendance_date", monthStart)
    .lte("attendance_date", monthEnd)
    .is("deleted_at", null);

  if (attendanceError) throw new Error(attendanceError.message);

  const statsByEmployee = new Map<
    string,
    {
      presentDays: number;
      leaveDays: number;
      absentDays: number;
      wfhDays: number;
      lateDays: number;
      totalWorkHours: number;
      workDayCount: number;
    }
  >();

  for (const employeeId of teamIds) {
    statsByEmployee.set(employeeId, {
      presentDays: 0,
      leaveDays: 0,
      absentDays: 0,
      wfhDays: 0,
      lateDays: 0,
      totalWorkHours: 0,
      workDayCount: 0,
    });
  }

  for (const row of attendanceRows ?? []) {
    const stats = statsByEmployee.get(row.employee_id);
    if (!stats) continue;

    switch (row.attendance_status as AttendanceStatus) {
      case "present":
      case "half_day":
        stats.presentDays += 1;
        break;
      case "on_leave":
      case "holiday":
      case "week_off":
        stats.leaveDays += 1;
        break;
      case "absent":
        stats.absentDays += 1;
        break;
      case "late":
        stats.lateDays += 1;
        stats.presentDays += 1;
        break;
      default:
        break;
    }

    const branch = unwrap(row.branches);
    if (isWorkFromHomeBranch(branch?.name, row.notes)) {
      stats.wfhDays += 1;
    }

    const hours = Number(row.work_hours ?? 0);
    if (hours > 0) {
      stats.totalWorkHours += hours;
      stats.workDayCount += 1;
    }
  }

  return (employees ?? []).map((employee) => {
    const department = unwrap(employee.departments);
    const stats = statsByEmployee.get(employee.id)!;

    return {
      employeeId: employee.id,
      employeeCode: employee.employee_code,
      employeeName: `${employee.first_name} ${employee.last_name}`,
      departmentName: department?.name ?? null,
      presentDays: stats.presentDays,
      leaveDays: stats.leaveDays,
      absentDays: stats.absentDays,
      wfhDays: stats.wfhDays,
      lateDays: stats.lateDays,
      averageWorkingHours:
        stats.workDayCount > 0
          ? Math.round((stats.totalWorkHours / stats.workDayCount) * 100) / 100
          : 0,
    };
  });
}

export async function getManagerTeamAttendancePageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  params: TeamAttendanceListParams,
): Promise<ManagerTeamAttendancePageData> {
  const parsed = parseParams(params);
  const organizationId = profile.employee.organizationId;

  const [summary, records, lookups, teamMembers, monthlySummary] = await Promise.all([
    getTeamAttendanceSummary(
      supabase,
      profile,
      teamIds,
      parsed.dateFrom,
      parsed.dateTo,
    ),
    listTeamAttendance(supabase, profile, teamIds, parsed),
    getTeamFilterLookups(supabase, organizationId, teamIds),
    getTeamMemberOptions(supabase, organizationId, teamIds),
    getTeamMonthlyAttendanceSummary(supabase, profile, teamIds),
  ]);

  return {
    summary,
    records,
    lookups: {
      departments: lookups.departments,
      employmentTypes: lookups.employmentTypes,
      teamMembers,
    },
    monthlySummary,
  };
}
