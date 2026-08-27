import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  AttendanceListParams,
  AttendanceListResult,
  AttendanceLookups,
  AttendanceSortField,
  AttendanceStatus,
  AttendanceDisplayStatus,
  AttendanceSummary,
} from "@/types/attendance";
import { attendanceListParamsSchema } from "@/lib/validations/attendance";
import {
  getTodayDateString,
  isAfterOfficeCheckoutTime,
} from "@/lib/attendance/services/attendance-utils";
import {
  getBranches,
  getDepartments,
} from "@/lib/employees/services/employee-queries";
import { cleanDisplayText, formatCleanEmployeeName } from "@/lib/employees/parse-employee-name";
import {
  resolveOrgDataEmployeeScope,
  scopedEmployeeIds,
} from "@/lib/manager/portal-scope";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

type AttendanceRow = {
  id: string;
  branch_id: string;
  employee_id: string;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  work_hours: number | string;
  overtime_hours: number | string;
  attendance_status: AttendanceStatus;
  branches: { name: string } | { name: string }[] | null;
  employees:
    | {
        employee_code: string;
        first_name: string;
        last_name: string;
        department_id: string | null;
        designation_id: string | null;
        departments: { name: string } | { name: string }[] | null;
        designations: { title: string } | { title: string }[] | null;
      }
    | {
        employee_code: string;
        first_name: string;
        last_name: string;
        department_id: string | null;
        designation_id: string | null;
        departments: { name: string } | { name: string }[] | null;
        designations: { title: string } | { title: string }[] | null;
      }[]
    | null;
};

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseListParams(params: AttendanceListParams) {
  return attendanceListParamsSchema.parse(params);
}

const EMPLOYEE_HISTORY_PAGE_SIZE = 1000;

export async function listAttendance(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: AttendanceListParams,
): Promise<AttendanceListResult> {
  const {
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    dateFrom,
    dateTo,
    branchId,
    departmentId,
    attendanceStatus,
    employeeId,
  } = parseListParams(params);

  const isEmployeeHistoryView = Boolean(employeeId && dateFrom && dateTo && dateFrom !== dateTo);
  const effectivePage = isEmployeeHistoryView ? 1 : page;
  const effectivePageSize = isEmployeeHistoryView ? EMPLOYEE_HISTORY_PAGE_SIZE : pageSize;
  const from = (effectivePage - 1) * effectivePageSize;
  const to = from + effectivePageSize - 1;
  const organizationId = profile.employee.organizationId;

  const employeeScope = await resolveOrgDataEmployeeScope(supabase, profile);
  const scopedIds = scopedEmployeeIds(employeeScope, employeeId);
  if (scopedIds && scopedIds.length === 0) {
    return { data: [], total: 0, page: effectivePage, pageSize: effectivePageSize };
  }

  const isSingleDayTeamView = !isEmployeeHistoryView && (!dateFrom || !dateTo || dateFrom === dateTo);
  const targetSingleDate = dateFrom ?? getTodayDateString();

  if (isSingleDayTeamView) {
    // 1. Fetch all active employees in organization / scope
    let empQuery = supabase
      .schema("hrms")
      .from("employees")
      .select(
        `
          id,
          employee_code,
          first_name,
          last_name,
          department_id,
          designation_id,
          branch_id,
          branches:branch_id (name),
          departments:department_id (name),
          designations:designation_id (title)
        `,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("employment_status", ["active", "probation", "on_leave"]);

    if (scopedIds) {
      empQuery = empQuery.in("id", scopedIds);
    } else if (employeeId) {
      empQuery = empQuery.eq("id", employeeId);
    }
    if (departmentId) {
      empQuery = empQuery.eq("department_id", departmentId);
    }
    if (branchId) {
      empQuery = empQuery.eq("branch_id", branchId);
    }
    if (search) {
      const term = `%${search}%`;
      empQuery = empQuery.or(
        `employee_code.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`,
      );
    }

    const [empRes, attRes, leavesRes] = await Promise.all([
      empQuery,
      supabase
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
            attendance_status
          `,
        )
        .eq("organization_id", organizationId)
        .eq("attendance_date", targetSingleDate)
        .is("deleted_at", null),
      (async () => {
        try {
          const res = await supabase
            .schema("hrms")
            .from("leave_requests")
            .select("employee_id, leave_status, employees!inner(organization_id)")
            .eq("employees.organization_id", organizationId)
            .eq("leave_status", "approved")
            .is("deleted_at", null)
            .lte("start_date", targetSingleDate)
            .gte("end_date", targetSingleDate);
          if (res.error) {
            console.warn("Non-critical leave query failed in listAttendance:", res.error.message);
            return { data: [] as LooseRow[], error: null };
          }
          return { data: (res.data ?? []) as LooseRow[], error: null };
        } catch {
          return { data: [] as LooseRow[], error: null };
        }
      })(),
    ]);

    if (empRes.error) {
      console.error("Failed to load employees for attendance:", empRes.error);
      throw new Error("Unable to load attendance records. Please try again.");
    }
    if (attRes.error) {
      console.error("Failed to load attendance records:", attRes.error);
      throw new Error("Unable to load attendance records. Please try again.");
    }

    const employees = (empRes.data ?? []) as LooseRow[];
    const attendanceMap = new Map<string, LooseRow>();
    for (const a of attRes.data ?? []) {
      attendanceMap.set(a.employee_id, a);
    }

    const leaveSet = new Set((leavesRes.data ?? []).map((l: LooseRow) => l.employee_id));

    // Fetch corrections for attendance records found (non-critical supporting data)
    const attendanceIds = (attRes.data ?? []).map((a: LooseRow) => a.id as string);
    const correctionsResult = attendanceIds.length
      ? await (async () => {
          try {
            const res = await supabase
              .schema("hrms")
              .from("attendance_corrections")
              .select("id, attendance_id, correction_status")
              .in("attendance_id", attendanceIds)
              .is("deleted_at", null)
              .order("created_at", { ascending: false });
            if (res.error) {
              console.warn("Non-critical corrections query failed in listAttendance:", res.error.message);
              return { data: [] as LooseRow[], error: null };
            }
            return { data: (res.data ?? []) as LooseRow[], error: null };
          } catch {
            return { data: [] as LooseRow[], error: null };
          }
        })()
      : { data: [] as LooseRow[], error: null };

    const correctionByAttendance = new Map<string, { id: string; status: string }>();
    for (const row of correctionsResult.data ?? []) {
      if (!correctionByAttendance.has(row.attendance_id)) {
        correctionByAttendance.set(row.attendance_id, {
          id: row.id,
          status: row.correction_status,
        });
      }
    }

    const todayStr = getTodayDateString();
    const isToday = targetSingleDate === todayStr;
    const isFuture = targetSingleDate > todayStr;
    const isAfter7Pm = isAfterOfficeCheckoutTime();

    type AttendanceItem = AttendanceListResult["data"][number];
    const allRecords: AttendanceItem[] = employees.map((emp) => {
      const att = attendanceMap.get(emp.id);
      const branch = unwrapRelation(emp.branches);
      const department = unwrapRelation(emp.departments);
      const designation = unwrapRelation(emp.designations);
      const hasApprovedLeave = leaveSet.has(emp.id);

      let status: AttendanceDisplayStatus;
      if (att?.check_in_at) {
        status = att.attendance_status as AttendanceStatus;
      } else if (hasApprovedLeave) {
        status = "on_leave";
      } else if (att?.attendance_status) {
        status = att.attendance_status as AttendanceStatus;
      } else if (isToday) {
        // Present day before 7:00 PM without punch is unrecorded/pending ("—"), marked absent only after 7:00 PM.
        status = isAfter7Pm ? "absent" : "upcoming";
      } else if (isFuture) {
        status = "upcoming";
      } else {
        status = "absent";
      }

      const correction = att ? correctionByAttendance.get(att.id) : undefined;

      return {
        id: att?.id ?? `virtual-${emp.id}-${targetSingleDate}`,
        employeeId: emp.id,
        employeeCode: emp.employee_code ?? "",
        employeeName: formatCleanEmployeeName(emp.first_name, emp.last_name),
        departmentId: emp.department_id ?? null,
        departmentName: department?.name ?? null,
        designationId: emp.designation_id ?? null,
        designationTitle: designation?.title ?? null,
        branchId: att?.branch_id ?? emp.branch_id ?? "",
        branchName: branch?.name ?? null,
        attendanceDate: targetSingleDate,
        checkInAt: att?.check_in_at ?? null,
        checkOutAt: att?.check_out_at ?? null,
        workHours: Number(att?.work_hours ?? 0),
        overtimeHours: Number(att?.overtime_hours ?? 0),
        attendanceStatus: status,
        correctionId: correction?.id ?? null,
        correctionStatus:
          (correction?.status as AttendanceListResult["data"][number]["correctionStatus"]) ??
          null,
      };
    });

    // Apply attendanceStatus filter
    const filteredRecords = allRecords.filter((record) => {
      if (!attendanceStatus) return true;
      if (attendanceStatus === "absent") {
        return record.attendanceStatus === "absent" || record.attendanceStatus === "on_leave";
      }
      return record.attendanceStatus === attendanceStatus;
    });

    // Sort
    const ascending = sortOrder === "asc";
    filteredRecords.sort((a, b) => {
      if (sortBy === "employee_code") {
        return ascending
          ? a.employeeCode.localeCompare(b.employeeCode)
          : b.employeeCode.localeCompare(a.employeeCode);
      }
      if (sortBy === "check_in_at") {
        const timeA = a.checkInAt ?? "";
        const timeB = b.checkInAt ?? "";
        if (!timeA && !timeB) return a.employeeName.localeCompare(b.employeeName);
        if (!timeA) return 1;
        if (!timeB) return -1;
        return ascending ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA);
      }
      return a.employeeName.localeCompare(b.employeeName);
    });

    const total = filteredRecords.length;
    const pageData = filteredRecords.slice(from, from + effectivePageSize);

    return {
      data: pageData,
      total,
      page: effectivePage,
      pageSize: effectivePageSize,
    };
  }

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
        branches:branch_id (name),
        employees!inner (
          employee_code,
          first_name,
          last_name,
          department_id,
          designation_id,
          departments:department_id (name),
          designations:designation_id (title)
        )
      `,
      { count: "estimated" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (scopedIds) {
    query = query.in("employee_id", scopedIds);
  } else if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  if (dateFrom) {
    query = query.gte("attendance_date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("attendance_date", dateTo);
  }

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  if (departmentId) {
    query = query.eq("employees.department_id", departmentId);
  }

  if (attendanceStatus) {
    if (attendanceStatus === "absent") {
      query = query.in("attendance_status", ["absent", "on_leave"]);
    } else {
      query = query.eq("attendance_status", attendanceStatus);
    }
  }

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `employee_code.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`,
      { referencedTable: "employees" },
    );
  }

  const ascending = sortOrder === "asc";
  const employeeSortFields: AttendanceSortField[] = ["employee_code"];

  if (employeeSortFields.includes(sortBy)) {
    query = query.order(sortBy, {
      ascending,
      referencedTable: "employees",
    });
  } else {
    query = query.order(sortBy, { ascending });
  }

  query = query.order("attendance_date", { ascending: false });
  if (!isEmployeeHistoryView) {
    query = query.order("check_in_at", { ascending: false, nullsFirst: false });
    query = query.order("created_at", { ascending: false });
  }
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as AttendanceRow[];
  const attendanceIds = rows.map((row) => row.id);

  const correctionsResult = attendanceIds.length
    ? await supabase
        .schema("hrms")
        .from("attendance_corrections")
        .select("id, attendance_id, correction_status")
        .in("attendance_id", attendanceIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (correctionsResult.error) {
    throw new Error(correctionsResult.error.message);
  }

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
      const employee = unwrapRelation(row.employees);
      const branch = unwrapRelation(row.branches);
      const department = unwrapRelation(employee?.departments ?? null);
      const designation = unwrapRelation(employee?.designations ?? null);
      const correction = correctionByAttendance.get(row.id);

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
        designationTitle: designation?.title ?? null,
        branchId: row.branch_id,
        branchName: branch?.name ?? null,
        attendanceDate: row.attendance_date,
        checkInAt: row.check_in_at,
        checkOutAt: row.check_out_at,
        workHours: Number(row.work_hours ?? 0),
        overtimeHours: Number(row.overtime_hours ?? 0),
        attendanceStatus: row.attendance_status,
        correctionId: correction?.id ?? null,
        correctionStatus:
          (correction?.status as AttendanceListResult["data"][number]["correctionStatus"]) ??
          null,
      };
    }),
    total: count ?? 0,
    page: effectivePage,
    pageSize: effectivePageSize,
  };
}

export async function getAttendanceSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  dateFrom = getTodayDateString(),
  dateTo = dateFrom,
): Promise<AttendanceSummary> {
  const organizationId = profile.employee.organizationId;
  const fromDate = dateFrom <= dateTo ? dateFrom : dateTo;
  const toDate = dateFrom <= dateTo ? dateTo : dateFrom;

  const attendanceBase = () =>
    supabase
      .schema("hrms")
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("attendance_date", fromDate)
      .lte("attendance_date", toDate);

  const [
    employeesResult,
    presentResult,
    absentResult,
    lateResult,
    halfDayResult,
    leaveResult,
  ] = await Promise.all([
    supabase
      .schema("hrms")
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("employment_status", ["active", "probation", "on_leave"]),
    attendanceBase().eq("attendance_status", "present"),
    attendanceBase().in("attendance_status", ["absent", "on_leave"]),
    attendanceBase().eq("attendance_status", "late"),
    attendanceBase().eq("attendance_status", "half_day"),
    (async () => {
      try {
        const res = await supabase
          .schema("hrms")
          .from("leave_requests")
          .select("id, employees!inner(organization_id)", { count: "exact", head: true })
          .eq("employees.organization_id", organizationId)
          .eq("leave_status", "approved")
          .is("deleted_at", null)
          .lte("start_date", toDate)
          .gte("end_date", fromDate);
        if (res.error) {
          console.warn("Non-critical leave query failed in getAttendanceSummary:", res.error.message);
          return { count: 0, error: null };
        }
        return res;
      } catch {
        return { count: 0, error: null };
      }
    })(),
  ]);

  if (employeesResult.error) {
    throw new Error(employeesResult.error.message);
  }
  if (presentResult.error) {
    throw new Error(presentResult.error.message);
  }
  if (absentResult.error) {
    throw new Error(absentResult.error.message);
  }
  if (lateResult.error) {
    throw new Error(lateResult.error.message);
  }
  if (halfDayResult.error) {
    throw new Error(halfDayResult.error.message);
  }

  const totalEmployees = employeesResult.count ?? 0;
  const presentToday = presentResult.count ?? 0;
  const lateToday = lateResult.count ?? 0;
  const halfDayToday = halfDayResult.count ?? 0;
  const explicitAbsent = absentResult.count ?? 0;
  const onLeaveToday = leaveResult.count ?? 0;

  const totalPunched = presentToday + lateToday + halfDayToday;
  const isSingleDay = fromDate === toDate;
  const todayStr = getTodayDateString();
  const isToday = isSingleDay && fromDate === todayStr;
  const isAfter7Pm = isAfterOfficeCheckoutTime();

  let absentToday = explicitAbsent;
  if (isSingleDay) {
    if (isToday) {
      absentToday = isAfter7Pm
        ? Math.max(explicitAbsent, totalEmployees - totalPunched - onLeaveToday)
        : explicitAbsent;
    } else if (fromDate < todayStr) {
      absentToday = Math.max(explicitAbsent, totalEmployees - totalPunched - onLeaveToday);
    } else {
      absentToday = explicitAbsent;
    }
  } else {
    absentToday = Math.max(explicitAbsent, totalEmployees - totalPunched);
  }

  return {
    date: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`,
    presentToday,
    absentToday,
    lateToday,
    halfDayToday,
    onLeaveToday,
    totalEmployees,
  };
}

export async function getAttendanceLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<AttendanceLookups> {
  const [branches, departments, employees] = await Promise.all([
    getBranches(supabase, organizationId),
    getDepartments(supabase, organizationId),
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, first_name, last_name, employee_code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("employment_status", ["active", "probation", "on_leave"])
      .order("first_name")
      .limit(250),
  ]);

  if (employees.error) throw new Error(employees.error.message);

  return {
    branches,
    departments,
    employees: (employees.data ?? []).map((employee) => ({
      id: employee.id,
      label: cleanDisplayText(`${employee.first_name} ${employee.last_name}`.trim()),
      code: employee.employee_code,
    })),
  };
}

export async function getEmployeeBranchId(
  supabase: AuthSupabaseClient,
  employeeId: string,
): Promise<string> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select("branch_id")
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.branch_id) {
    throw new Error("Employee not found");
  }

  return data.branch_id;
}

export async function getEmployeeDepartmentLabel(
  supabase: AuthSupabaseClient,
  employeeId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select("departments:department_id (name)")
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const department = data?.departments as { name?: string } | { name?: string }[] | null;
  if (!department) return null;
  if (Array.isArray(department)) {
    return department[0]?.name ?? null;
  }
  return department.name ?? null;
}

export async function attendanceExistsForEmployeeDate(
  supabase: AuthSupabaseClient,
  employeeId: string,
  attendanceDate: string,
  excludeAttendanceId?: string,
): Promise<boolean> {
  let query = supabase
    .schema("hrms")
    .from("attendance")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("attendance_date", attendanceDate)
    .is("deleted_at", null);

  if (excludeAttendanceId) {
    query = query.neq("id", excludeAttendanceId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}
