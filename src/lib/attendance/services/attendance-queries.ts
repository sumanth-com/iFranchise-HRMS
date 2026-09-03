import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  AttendanceListParams,
  AttendanceListResult,
  AttendanceLookups,
  AttendanceStatus,
  AttendanceDisplayStatus,
  AttendanceSummary,
} from "@/types/attendance";
import { attendanceListParamsSchema } from "@/lib/validations/attendance";
import {
  computeLateMinutes,
  computeWorkHours,
  getTodayDateString,
  isAfterOfficeCheckoutTime,
  OFFICE_LATE_AFTER_TIME,
} from "@/lib/attendance/services/attendance-utils";
import {
  DIRECTORY_HIDDEN_EMPLOYEE_CODES,
  isHiddenFromPeopleFilters,
} from "@/lib/employee/directory-listing";
import { formatCleanEmployeeName, cleanDisplayText } from "@/lib/employees/parse-employee-name";
import { getBranches, getOccupiedDepartments } from "@/lib/employees/services/employee-queries";
import {
  resolveOrgDataEmployeeScope,
  scopedEmployeeIds,
} from "@/lib/manager/portal-scope";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isHiddenAttendancePerson(row: LooseRow): boolean {
  const designation = unwrapRelation(
    row.designations as { title: string } | { title: string }[] | null,
  );
  return isHiddenFromPeopleFilters(row.employee_code as string | null, {
    employeeCode: row.employee_code as string | null,
    firstName: row.first_name as string | null,
    lastName: row.last_name as string | null,
    designationTitle: designation?.title ?? null,
  });
}

function parseListParams(params: AttendanceListParams) {
  return attendanceListParamsSchema.parse(params);
}

function eachInclusiveDate(from: string, to: string): string[] {
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor.getTime() <= last.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function toDateKey(value: unknown): string {
  if (value == null) return "";
  const raw = String(value);
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

function leaveCoversDate(
  leaves: LooseRow[],
  employeeId: string,
  date: string,
): boolean {
  return leaves.some((leave) => {
    if (leave.employee_id !== employeeId) return false;
    const start = String(leave.start_date ?? "");
    const end = String(leave.end_date ?? "");
    return start <= date && date <= end;
  });
}

function matchesAttendanceStatusFilter(
  status: AttendanceDisplayStatus,
  filter?: AttendanceStatus,
) {
  if (!filter) return true;
  if (filter === "absent") {
    return status === "absent" || status === "on_leave";
  }
  if (filter === "present") {
    return status === "present" || status === "half_day";
  }
  return status === filter;
}

async function loadAttendanceRoster(
  supabase: AuthSupabaseClient,
  params: {
    organizationId: string;
    rangeFrom: string;
    rangeTo: string;
    employeeId?: string;
    departmentId?: string;
    branchId?: string;
    search?: string;
    scopedIds: string[] | null;
    includeCorrections: boolean;
  },
): Promise<AttendanceListResult["data"]> {
  const {
    organizationId,
    rangeFrom,
    rangeTo,
    employeeId,
    departmentId,
    branchId,
    search,
    scopedIds,
    includeCorrections,
  } = params;
  const isSingleDay = rangeFrom === rangeTo;
  const rosterDates = isSingleDay ? [rangeFrom] : eachInclusiveDate(rangeFrom, rangeTo);

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

  const hiddenCodes = [...DIRECTORY_HIDDEN_EMPLOYEE_CODES];
  if (hiddenCodes.length > 0) {
    empQuery = empQuery.not("employee_code", "in", `(${hiddenCodes.join(",")})`);
  }

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

  let attQuery = supabase
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
    .gte("attendance_date", rangeFrom)
    .lte("attendance_date", rangeTo)
    .is("deleted_at", null)
    .limit(10000);

  if (scopedIds) {
    attQuery = attQuery.in("employee_id", scopedIds);
  } else if (employeeId) {
    attQuery = attQuery.eq("employee_id", employeeId);
  }

  const [empRes, attRes, leavesRes] = await Promise.all([
    empQuery,
    attQuery,
    (async () => {
      try {
        const res = await supabase
          .schema("hrms")
          .from("leave_requests")
          .select("employee_id, start_date, end_date, leave_status, employees!inner(organization_id)")
          .eq("employees.organization_id", organizationId)
          .eq("leave_status", "approved")
          .is("deleted_at", null)
          .lte("start_date", rangeTo)
          .gte("end_date", rangeFrom);
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

  const employees = ((empRes.data ?? []) as LooseRow[]).filter(
    (row) => !isHiddenAttendancePerson(row),
  );
  const attendanceMap = new Map<string, LooseRow>();
  for (const a of attRes.data ?? []) {
    attendanceMap.set(`${a.employee_id}:${toDateKey(a.attendance_date)}`, a);
  }

  const approvedLeaves = (leavesRes.data ?? []) as LooseRow[];

  const attendanceIds = includeCorrections
    ? (attRes.data ?? []).map((a: LooseRow) => a.id as string)
    : [];
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
  const isAfter7Pm = isAfterOfficeCheckoutTime();
  const records: AttendanceListResult["data"] = [];

  for (const emp of employees) {
    const branch = unwrapRelation(emp.branches);
    const department = unwrapRelation(emp.departments);
    const designation = unwrapRelation(emp.designations);

    for (const rosterDate of rosterDates) {
      const att = attendanceMap.get(`${emp.id}:${rosterDate}`);
      const hasApprovedLeave = leaveCoversDate(approvedLeaves, emp.id, rosterDate);
      const checkInAt = att?.check_in_at ?? null;
      const checkOutAt = att?.check_out_at ?? null;
      const punchedWorkHours =
        checkInAt && checkOutAt
          ? Number(att?.work_hours) > 0
            ? Number(att?.work_hours)
            : computeWorkHours(checkInAt, checkOutAt)
          : Number(att?.work_hours ?? 0);

      let status: AttendanceDisplayStatus;
      if (checkInAt) {
        const lateMinutes = computeLateMinutes(
          checkInAt,
          rosterDate,
          OFFICE_LATE_AFTER_TIME,
        );
        if (checkOutAt && punchedWorkHours < 0.25) {
          status = "absent";
        } else if (lateMinutes > 0) {
          status = "late";
        } else {
          status = (att?.attendance_status as AttendanceStatus) || "present";
        }
      } else if (hasApprovedLeave) {
        status = "on_leave";
      } else if (att?.attendance_status) {
        status = att.attendance_status as AttendanceStatus;
      } else if (!isSingleDay) {
        status = "upcoming";
      } else if (rosterDate === todayStr) {
        status = isAfter7Pm ? "absent" : "upcoming";
      } else if (rosterDate > todayStr) {
        status = "upcoming";
      } else {
        status = "absent";
      }

      const correction = att ? correctionByAttendance.get(att.id) : undefined;

      records.push({
        id: att?.id ?? `virtual-${emp.id}-${rosterDate}`,
        employeeId: emp.id,
        employeeCode: emp.employee_code ?? "",
        employeeName: formatCleanEmployeeName(emp.first_name, emp.last_name),
        departmentId: emp.department_id ?? null,
        departmentName: department?.name ?? null,
        designationId: emp.designation_id ?? null,
        designationTitle: designation?.title ?? null,
        branchId: att?.branch_id ?? emp.branch_id ?? "",
        branchName: branch?.name ?? null,
        attendanceDate: rosterDate,
        checkInAt,
        checkOutAt,
        workHours: punchedWorkHours,
        overtimeHours: Number(att?.overtime_hours ?? 0),
        attendanceStatus: status,
        correctionId: correction?.id ?? null,
        correctionStatus:
          (correction?.status as AttendanceListResult["data"][number]["correctionStatus"]) ??
          null,
      });
    }
  }

  return records;
}

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

  const effectivePage = page;
  const effectivePageSize = pageSize;
  const from = (effectivePage - 1) * effectivePageSize;
  const organizationId = profile.employee.organizationId;

  const employeeScope = await resolveOrgDataEmployeeScope(supabase, profile);
  const scopedIds = scopedEmployeeIds(employeeScope, employeeId);
  if (scopedIds && scopedIds.length === 0) {
    return {
      data: [],
      total: 0,
      page: effectivePage,
      pageSize: effectivePageSize,
      historyCounts: { presentDays: 0, absentDays: 0 },
    };
  }

  const rangeFrom = dateFrom ?? getTodayDateString();
  const rangeTo = dateTo ?? rangeFrom;
  const isSingleDay = rangeFrom === rangeTo;

  const allRecords = await loadAttendanceRoster(supabase, {
    organizationId,
    rangeFrom,
    rangeTo,
    employeeId,
    departmentId,
    branchId,
    search,
    scopedIds,
    includeCorrections: true,
  });

  const filteredRecords = allRecords.filter((record) =>
    matchesAttendanceStatusFilter(record.attendanceStatus, attendanceStatus),
  );

  const ascending = sortOrder === "asc";
  filteredRecords.sort((a, b) => {
    if (!isSingleDay) {
      const byDate = a.attendanceDate.localeCompare(b.attendanceDate);
      if (byDate !== 0) return byDate;
      return a.employeeName.localeCompare(b.employeeName);
    }
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

  let presentDays = 0;
  let absentDays = 0;
  for (const row of allRecords) {
    if (
      row.attendanceStatus === "present" ||
      row.attendanceStatus === "late" ||
      row.attendanceStatus === "half_day"
    ) {
      presentDays += 1;
    } else if (row.attendanceStatus === "absent") {
      absentDays += 1;
    }
  }

  return {
    data: pageData,
    total,
    page: effectivePage,
    pageSize: effectivePageSize,
    historyCounts: { presentDays, absentDays },
  };
}

export async function getAttendanceSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  dateFrom = getTodayDateString(),
  dateTo = dateFrom,
  filters?: { departmentId?: string; branchId?: string; employeeId?: string },
): Promise<AttendanceSummary> {
  const organizationId = profile.employee.organizationId;
  const fromDate = dateFrom <= dateTo ? dateFrom : dateTo;
  const toDate = dateFrom <= dateTo ? dateTo : dateFrom;
  const employeeId = filters?.employeeId;

  const employeeScope = await resolveOrgDataEmployeeScope(supabase, profile);
  const scopedIds = scopedEmployeeIds(employeeScope, employeeId);
  if (scopedIds && scopedIds.length === 0) {
    return {
      date: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`,
      presentToday: 0,
      absentToday: 0,
      lateToday: 0,
      halfDayToday: 0,
      onLeaveToday: 0,
      totalEmployees: 0,
    };
  }

  const records = await loadAttendanceRoster(supabase, {
    organizationId,
    rangeFrom: fromDate,
    rangeTo: toDate,
    employeeId,
    departmentId: employeeId ? undefined : filters?.departmentId,
    branchId: filters?.branchId,
    scopedIds,
    includeCorrections: false,
  });

  const employeeIds = new Set(records.map((row) => row.employeeId));
  let presentToday = 0;
  let absentToday = 0;
  let lateToday = 0;
  let halfDayToday = 0;
  let onLeaveToday = 0;

  for (const row of records) {
    if (row.attendanceStatus === "present") presentToday += 1;
    else if (row.attendanceStatus === "half_day") halfDayToday += 1;
    else if (row.attendanceStatus === "late") lateToday += 1;
    else if (row.attendanceStatus === "absent") absentToday += 1;
    else if (row.attendanceStatus === "on_leave") onLeaveToday += 1;
  }

  if (employeeId) {
    return {
      date: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`,
      presentToday: presentToday + halfDayToday + lateToday,
      absentToday,
      lateToday,
      halfDayToday,
      onLeaveToday,
      totalEmployees: employeeIds.size,
    };
  }

  return {
    date: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`,
    presentToday: presentToday + halfDayToday,
    absentToday: absentToday + onLeaveToday,
    lateToday,
    halfDayToday,
    onLeaveToday,
    totalEmployees: employeeIds.size,
  };
}

export async function getAttendanceLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<AttendanceLookups> {
  const hiddenCodes = [...DIRECTORY_HIDDEN_EMPLOYEE_CODES];
  let employeesQuery = supabase
    .schema("hrms")
    .from("employees")
    .select("id, first_name, last_name, employee_code, designations:designation_id (title)")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .in("employment_status", ["active", "probation", "on_leave"])
    .order("first_name")
    .limit(250);

  if (hiddenCodes.length > 0) {
    employeesQuery = employeesQuery.not(
      "employee_code",
      "in",
      `(${hiddenCodes.join(",")})`,
    );
  }

  const [branches, departments, employees] = await Promise.all([
    getBranches(supabase, organizationId),
    getOccupiedDepartments(supabase, organizationId),
    employeesQuery,
  ]);

  if (employees.error) throw new Error(employees.error.message);

  return {
    branches,
    departments,
    employees: ((employees.data ?? []) as LooseRow[])
      .filter((employee) => !isHiddenAttendancePerson(employee))
      .map((employee) => ({
        id: employee.id as string,
        label: cleanDisplayText(
          `${employee.first_name} ${employee.last_name}`.trim(),
        ),
        code: employee.employee_code as string,
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
