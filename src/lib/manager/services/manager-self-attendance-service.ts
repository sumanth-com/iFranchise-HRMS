import {
  addDays,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
} from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getOrganizationAttendanceRules } from "@/lib/attendance/services/attendance-detail";
import {
  notifyAttendanceCheckedIn,
  notifyAttendanceCheckedOut,
  notifyAttendanceCheckoutUpdated,
  notifyAttendanceRegularizationRequested,
} from "@/lib/attendance/services/attendance-notifications";
import {
  combineDateAndTime,
  computeLateMinutes,
  computeWorkHours,
  extractTimeFromTimestamp,
  formatAttendanceTime,
  getTodayDateString,
  OFFICE_CHECK_IN_LOCK_TIME,
  OFFICE_TIMEZONE,
  type AttendanceRules,
} from "@/lib/attendance/services/attendance-utils";
import { getEmployeeBranchId } from "@/lib/attendance/services/attendance-queries";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import { parseWorkingConfiguration } from "@/lib/company-settings/services/company-settings-parsers";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import { createSignedStorageUrl } from "@/lib/employees/services/employee-mutations";
import { buildEmployeeRouteRef } from "@/lib/employees/routing";
import { expandDateRange, getMonthDateRange } from "@/lib/leave/services/leave-utils";
import { hasPermission } from "@/lib/permissions/utils";
import type {
  ManagerAttendancePunchInput,
  ManagerAttendanceRegularizationInput,
  ManagerProfilePageParams,
  ManagerUpdateCheckoutInput,
} from "@/lib/validations/manager-self-attendance";
import type { UserProfile } from "@/types/auth";
import type { AttendanceStatus } from "@/types/attendance";
import type { WeekendDayRule } from "@/types/company-settings";
import type { CorrectionStatus } from "@/types/manager-attendance";
import type {
  ManagerAttendanceCalendarDay,
  ManagerAttendanceHistoryResult,
  ManagerAttendanceHistoryRow,
  ManagerAttendanceMonthSummary,
  ManagerAttendancePunchState,
  ManagerProfileCardData,
  ManagerProfilePageData,
  ManagerTodayAttendance,
} from "@/types/manager-self-attendance";

type AttendanceRow = {
  id: string;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  attendance_status: AttendanceStatus;
  work_hours: number | string;
  overtime_hours: number | string;
  notes: string | null;
};

type CorrectionRow = {
  id: string;
  attendance_id: string;
  correction_status: CorrectionStatus;
};

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function formatHoursLabel(hours: number) {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

export function formatWorkingDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function getElapsedWorkingSeconds(
  checkInAt: string | null,
  checkOutAt: string | null,
) {
  if (!checkInAt) return 0;
  const end = checkOutAt ? parseISO(checkOutAt) : new Date();
  return Math.max(0, differenceInMinutes(end, parseISO(checkInAt)) * 60);
}

function getOfficeNowParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: OFFICE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0",
  );
  return { hour, minute, totalMinutes: hour * 60 + minute };
}

export function isCheckInLockedNow(attendanceDate: string) {
  const today = getTodayDateString();
  if (attendanceDate < today) return true;
  if (attendanceDate > today) return false;

  const [lockHour, lockMinute] = OFFICE_CHECK_IN_LOCK_TIME.split(":").map((part) =>
    Number.parseInt(part, 10),
  );
  const lockMinutes = lockHour * 60 + lockMinute;
  return getOfficeNowParts().totalMinutes >= lockMinutes;
}

/** HR portal users can check in anytime — office check-in lock does not apply. */
export function shouldEnforceCheckInLock(profile: Pick<UserProfile, "permissionCodes">) {
  return !hasPermission(profile.permissionCodes, PORTAL_PERMISSIONS.hr);
}

/** @deprecated Prefer isCheckInLockedNow — checkout is never auto-locked by time. */
export function isAttendanceLockedNow(attendanceDate: string) {
  return isCheckInLockedNow(attendanceDate);
}

function computeOvertimeHours(workHours: number, rules: AttendanceRules) {
  return Math.max(
    0,
    Math.round((workHours - rules.fullDayMinimumHours) * 100) / 100,
  );
}

function resolvePunchStatus(
  checkInAt: string | null,
  checkOutAt: string | null,
  attendanceDate: string,
  rules: AttendanceRules,
  options?: { finalizeHours?: boolean },
): AttendanceStatus {
  const lateMinutes = computeLateMinutes(checkInAt, attendanceDate, rules.lateAfter);
  const workHours = computeWorkHours(checkInAt, checkOutAt);
  const today = getTodayDateString();
  // Finalize hours once checkout is recorded, or for past days.
  const finalizeHours =
    options?.finalizeHours ?? (Boolean(checkOutAt) || attendanceDate < today);

  // Until checkout is recorded, status follows check-in only (present / late).
  // Hours-based half-day / absent apply once the workday has a checkout.
  if (
    finalizeHours &&
    checkOutAt &&
    workHours > 0 &&
    workHours < rules.fullDayMinimumHours
  ) {
    if (workHours < rules.halfDayMinimumHours) return "absent";
    return "half_day";
  }

  if (lateMinutes > 0) return "late";
  return "present";
}

function resolvePunchState(
  checkInAt: string | null,
  checkOutAt: string | null,
  attendanceDate: string,
  enforceCheckInLock = true,
): ManagerAttendancePunchState {
  // Checkout is never auto-locked — only check-in closes at OFFICE_CHECK_IN_LOCK_TIME.
  if (!checkInAt) {
    if (!enforceCheckInLock) return "not_checked_in";
    return isCheckInLockedNow(attendanceDate) && attendanceDate <= getTodayDateString()
      ? "locked"
      : "not_checked_in";
  }
  if (!checkOutAt) return "checked_in";
  return "checked_out";
}

function buildTodayPanel(
  row: AttendanceRow | null,
  attendanceDate: string,
  rules: AttendanceRules,
  enforceCheckInLock = true,
): ManagerTodayAttendance {
  const checkInAt = row?.check_in_at ?? null;
  const checkOutAt = row?.check_out_at ?? null;
  const checkInLocked = enforceCheckInLock && isCheckInLockedNow(attendanceDate);
  const punchState = resolvePunchState(
    checkInAt,
    checkOutAt,
    attendanceDate,
    enforceCheckInLock,
  );
  const workHours = row
    ? Number(row.work_hours ?? 0)
    : computeWorkHours(checkInAt, checkOutAt);
  const lateMinutes = computeLateMinutes(checkInAt, attendanceDate, rules.lateAfter);
  const overtimeHours = row
    ? Number(row.overtime_hours ?? 0)
    : computeOvertimeHours(workHours, rules);

  // Prefer live punch status so an early checkout does not show Half Day until hours finalize.
  const attendanceStatus = checkInAt
    ? resolvePunchStatus(checkInAt, checkOutAt, attendanceDate, rules)
    : row?.attendance_status ?? null;

  const lockTimeLabel = formatAttendanceTime(
    `${attendanceDate}T${OFFICE_CHECK_IN_LOCK_TIME}:00+05:30`,
  );

  let lockMessage: string | null = null;
  if (enforceCheckInLock && attendanceDate === getTodayDateString()) {
    if (!checkInAt && checkInLocked) {
      lockMessage = `Check-in locked. Check-in closed at ${lockTimeLabel}.`;
    } else if (!checkInAt) {
      lockMessage = `Check-in will automatically lock at ${lockTimeLabel}.`;
    }
  }

  return {
    attendanceId: row?.id ?? null,
    attendanceDate,
    punchState,
    attendanceStatus,
    checkInAt,
    checkOutAt,
    workHours,
    overtimeHours,
    lateMinutes,
    isLocked: checkInLocked && !checkInAt,
    lockMessage,
    workingDurationLabel: formatWorkingDuration(
      getElapsedWorkingSeconds(checkInAt, checkOutAt),
    ),
  };
}

async function getAttendanceForDate(
  supabase: AuthSupabaseClient,
  employeeId: string,
  attendanceDate: string,
): Promise<AttendanceRow | null> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance")
    .select(
      "id, attendance_date, check_in_at, check_out_at, attendance_status, work_hours, overtime_hours, notes",
    )
    .eq("employee_id", employeeId)
    .eq("attendance_date", attendanceDate)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function loadMonthAttendance(
  supabase: AuthSupabaseClient,
  employeeId: string,
  month: number,
  year: number,
): Promise<AttendanceRow[]> {
  const { start, end } = getMonthDateRange(month, year);
  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance")
    .select(
      "id, attendance_date, check_in_at, check_out_at, attendance_status, work_hours, overtime_hours, notes",
    )
    .eq("employee_id", employeeId)
    .gte("attendance_date", start)
    .lte("attendance_date", end)
    .is("deleted_at", null)
    .order("attendance_date", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadMonthCorrections(
  supabase: AuthSupabaseClient,
  employeeId: string,
  attendanceIds: string[],
): Promise<CorrectionRow[]> {
  if (attendanceIds.length === 0) return [];

  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance_corrections")
    .select("id, attendance_id, correction_status")
    .eq("employee_id", employeeId)
    .in("attendance_id", attendanceIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadMonthLeaves(
  supabase: AuthSupabaseClient,
  employeeId: string,
  month: number,
  year: number,
) {
  const { start, end } = getMonthDateRange(month, year);
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select(
      "id, start_date, end_date, leave_status, leave_types:leave_type_id (name)",
    )
    .eq("employee_id", employeeId)
    .eq("leave_status", "approved")
    .is("deleted_at", null)
    .lte("start_date", end)
    .gte("end_date", start);

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadMonthHolidays(
  supabase: AuthSupabaseClient,
  organizationId: string,
  month: number,
  year: number,
) {
  const { start, end } = getMonthDateRange(month, year);
  const { data, error } = await supabase
    .schema("hrms")
    .from("holidays")
    .select("id, name, holiday_date")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("holiday_date", start)
    .lte("holiday_date", end);

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadWeekendRules(
  supabase: AuthSupabaseClient,
  organizationId: string,
) {
  const { data } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings, work_week_start_day, timezone")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  const working = parseWorkingConfiguration(
    (data?.settings as Record<string, unknown> | null) ?? null,
    {
      workWeekStartDay: data?.work_week_start_day ?? 1,
      timezone: data?.timezone ?? OFFICE_TIMEZONE,
    },
  );

  return working.weekendRules;
}

function weekendStatusForDate(
  date: string,
  weekendRules: { saturday: WeekendDayRule; sunday: WeekendDayRule },
): AttendanceStatus | null {
  const dow = getDay(parseISO(date));
  if (dow === 6) {
    if (weekendRules.saturday === "off") return "week_off";
    if (weekendRules.saturday === "half_day") return "half_day";
    return null;
  }
  if (dow === 0) {
    if (weekendRules.sunday === "off") return "week_off";
    if (weekendRules.sunday === "half_day") return "half_day";
    return null;
  }
  return null;
}

function averageTimeLabel(timestamps: string[]): string | null {
  if (timestamps.length === 0) return null;

  const totalMinutes = timestamps.reduce((sum, value) => {
    const time = extractTimeFromTimestamp(value);
    const [hours, minutes] = time.split(":").map((part) => Number.parseInt(part, 10));
    return sum + hours * 60 + minutes;
  }, 0);

  const avg = Math.round(totalMinutes / timestamps.length);
  const hours = Math.floor(avg / 60);
  const minutes = avg % 60;
  const date = getTodayDateString();
  return formatAttendanceTime(
    `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`,
  );
}

function computeStreaks(
  days: { date: string; status: AttendanceStatus | null; isWorkingDay: boolean }[],
  today: string,
) {
  const sorted = [...days]
    .filter((day) => day.date <= today && day.isWorkingDay)
    .sort((a, b) => a.date.localeCompare(b.date));

  const isPresentLike = (status: AttendanceStatus | null) =>
    status === "present" || status === "late" || status === "half_day";

  let best = 0;
  let run = 0;
  for (const day of sorted) {
    if (isPresentLike(day.status)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    if (isPresentLike(sorted[index].status)) current += 1;
    else break;
  }

  return { currentStreak: current, bestStreak: best };
}

function buildCalendarDays(input: {
  month: number;
  year: number;
  today: string;
  attendanceByDate: Map<string, AttendanceRow>;
  holidayByDate: Map<string, string>;
  leaveByDate: Map<string, string>;
  weekendRules: { saturday: WeekendDayRule; sunday: WeekendDayRule };
  rules: AttendanceRules;
}): ManagerAttendanceCalendarDay[] {
  const monthStart = startOfMonth(new Date(input.year, input.month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const gridStart = addDays(monthStart, -getDay(monthStart));
  const gridEnd = addDays(monthEnd, 6 - getDay(monthEnd));

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((day) => {
    const date = format(day, "yyyy-MM-dd");
    const inMonth = day.getMonth() === input.month - 1;
    const isToday = date === input.today;
    const isFuture = date > input.today;
    const attendance = input.attendanceByDate.get(date) ?? null;
    const holidayName = input.holidayByDate.get(date) ?? null;
    const leaveTypeName = input.leaveByDate.get(date) ?? null;
    const weekendStatus = weekendStatusForDate(date, input.weekendRules);

    let status: AttendanceStatus | null = null;
    if (attendance) {
      // Live status: early checkout before lock should not appear as half day.
      status = resolvePunchStatus(
        attendance.check_in_at,
        attendance.check_out_at,
        date,
        input.rules,
      );
    } else if (holidayName) {
      status = "holiday";
    } else if (leaveTypeName) {
      status = "on_leave";
    } else if (weekendStatus) {
      status = weekendStatus;
    } else if (inMonth && !isFuture) {
      status = "absent";
    }

    return {
      date,
      dayOfMonth: day.getDate(),
      inMonth,
      isToday,
      isFuture,
      status,
      attendanceId: attendance?.id ?? null,
      checkInAt: attendance?.check_in_at ?? null,
      checkOutAt: attendance?.check_out_at ?? null,
      workHours: attendance ? Number(attendance.work_hours ?? 0) : 0,
      holidayName,
      leaveTypeName,
    };
  });
}

function buildMonthSummary(
  calendarDays: ManagerAttendanceCalendarDay[],
  attendanceRows: AttendanceRow[],
  rules: AttendanceRules,
  today: string,
): ManagerAttendanceMonthSummary {
  const inMonth = calendarDays.filter((day) => day.inMonth);
  const workingDays = inMonth.filter(
    (day) =>
      day.status !== "week_off" &&
      day.status !== "holiday" &&
      !(day.isFuture && !day.attendanceId),
  ).length;

  const counts = {
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    halfDay: 0,
    weekend: 0,
    holiday: 0,
  };

  for (const day of inMonth) {
    switch (day.status) {
      case "present":
        counts.present += 1;
        break;
      case "absent":
        counts.absent += 1;
        break;
      case "late":
        counts.late += 1;
        break;
      case "on_leave":
        counts.leave += 1;
        break;
      case "half_day":
        counts.halfDay += 1;
        break;
      case "week_off":
        counts.weekend += 1;
        break;
      case "holiday":
        counts.holiday += 1;
        break;
      default:
        break;
    }
  }

  const worked = attendanceRows.filter((row) =>
    ["present", "late", "half_day"].includes(row.attendance_status),
  );
  const totalHours = worked.reduce(
    (sum, row) => sum + Number(row.work_hours ?? 0),
    0,
  );
  const overtimeHours = worked.reduce(
    (sum, row) => sum + Number(row.overtime_hours ?? 0),
    0,
  );

  const streaks = computeStreaks(
    inMonth.map((day) => ({
      date: day.date,
      status: day.status,
      isWorkingDay:
        day.status !== "week_off" &&
        day.status !== "holiday" &&
        day.status !== null,
    })),
    today,
  );

  return {
    workingDays,
    present: counts.present,
    absent: counts.absent,
    late: counts.late,
    leave: counts.leave,
    halfDay: counts.halfDay,
    weekend: counts.weekend,
    holiday: counts.holiday,
    averageWorkingHours:
      worked.length > 0
        ? Math.round((totalHours / worked.length) * 100) / 100
        : 0,
    averageCheckIn: averageTimeLabel(
      worked.map((row) => row.check_in_at).filter(Boolean) as string[],
    ),
    averageCheckOut: averageTimeLabel(
      worked.map((row) => row.check_out_at).filter(Boolean) as string[],
    ),
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    currentStreak: streaks.currentStreak,
    bestStreak: streaks.bestStreak,
  };
}

function buildHistoryRows(input: {
  month: number;
  year: number;
  today: string;
  attendanceByDate: Map<string, AttendanceRow>;
  correctionsByAttendanceId: Map<string, CorrectionRow>;
  holidayByDate: Map<string, string>;
  leaveByDate: Map<string, string>;
  weekendRules: { saturday: WeekendDayRule; sunday: WeekendDayRule };
  rules: AttendanceRules;
  status?: AttendanceStatus;
  searchDate?: string;
  page: number;
  pageSize: number;
}): ManagerAttendanceHistoryResult {
  const { start, end } = getMonthDateRange(input.month, input.year);
  const days = eachDayOfInterval({
    start: parseISO(start),
    end: parseISO(end),
  });

  const rows: ManagerAttendanceHistoryRow[] = days.map((day) => {
    const date = format(day, "yyyy-MM-dd");
    const attendance = input.attendanceByDate.get(date) ?? null;
    const holidayName = input.holidayByDate.get(date) ?? null;
    const leaveTypeName = input.leaveByDate.get(date) ?? null;
    const weekendStatus = weekendStatusForDate(date, input.weekendRules);

    let status: AttendanceStatus = "absent";
    if (attendance) {
      status = resolvePunchStatus(
        attendance.check_in_at,
        attendance.check_out_at,
        date,
        input.rules,
      );
    } else if (holidayName) status = "holiday";
    else if (leaveTypeName) status = "on_leave";
    else if (weekendStatus) status = weekendStatus;
    else if (date > input.today) status = "absent";

    const correction = attendance
      ? input.correctionsByAttendanceId.get(attendance.id) ?? null
      : null;
    const lateMinutes = computeLateMinutes(
      attendance?.check_in_at,
      date,
      input.rules.lateAfter,
    );
    const canUpdateCheckout = Boolean(
      attendance?.check_in_at && date === input.today,
    );
    const canRequestRegularization =
      date <= input.today &&
      (!correction || correction.correction_status !== "pending");

    let remarks = attendance?.notes ?? null;
    if (!remarks && holidayName) remarks = holidayName;
    if (!remarks && leaveTypeName) remarks = leaveTypeName;
    if (!remarks && weekendStatus === "week_off") {
      remarks = getDay(day) === 0 ? "Sunday" : "Saturday";
    }

    return {
      id: attendance?.id ?? null,
      attendanceDate: date,
      attendanceStatus: status,
      checkInAt: attendance?.check_in_at ?? null,
      checkOutAt: attendance?.check_out_at ?? null,
      workHours: attendance ? Number(attendance.work_hours ?? 0) : 0,
      lateMinutes,
      overtimeHours: attendance ? Number(attendance.overtime_hours ?? 0) : 0,
      remarks,
      correctionStatus: correction?.correction_status ?? null,
      correctionId: correction?.id ?? null,
      canUpdateCheckout,
      canRequestRegularization,
    };
  });

  let filtered = rows;
  if (input.status) {
    filtered = filtered.filter((row) => row.attendanceStatus === input.status);
  }
  if (input.searchDate) {
    filtered = filtered.filter((row) => row.attendanceDate === input.searchDate);
  }

  const total = filtered.length;
  const startIndex = (input.page - 1) * input.pageSize;
  const data = filtered.slice(startIndex, startIndex + input.pageSize);

  return { data, total, page: input.page, pageSize: input.pageSize };
}

async function buildProfileCard(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<ManagerProfileCardData> {
  const employee = await getEmployeeById(supabase, profile.employee.id);
  if (!employee) {
    throw new Error("Employee profile not found.");
  }

  const imagePath = employee.profile?.profileImageStoragePath ?? null;
  const imageUrl = imagePath
    ? await createSignedStorageUrl(
        supabase,
        EMPLOYEE_STORAGE_BUCKETS.profileImages,
        imagePath,
      )
    : null;

  return {
    employeeId: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    employeeCode: employee.employeeCode,
    designation: employee.designationTitle,
    departmentName: employee.departmentName,
    employmentTypeName: employee.employmentTypeName ?? "Full Time",
    employmentStatus: employee.employmentStatus,
    accountStatus: employee.accountStatus,
    reportingTo: employee.reportingManagerName,
    joiningDate: employee.dateOfJoining,
    email: employee.email,
    phone: employee.phone,
    imageUrl,
    profilePath: `/e/${buildEmployeeRouteRef({
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
    })}/card`,
  };
}

export async function getManagerProfilePageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: ManagerProfilePageParams,
): Promise<ManagerProfilePageData> {
  const today = getTodayDateString();
  const todayDate = parseISO(today);
  const month = params.month ?? todayDate.getMonth() + 1;
  const year = params.year ?? todayDate.getFullYear();
  const employeeId = profile.employee.id;
  const organizationId = profile.employee.organizationId;

  const [
    rules,
    todayRow,
    monthRows,
    leaves,
    holidays,
    weekendRules,
    profileCard,
  ] = await Promise.all([
    getOrganizationAttendanceRules(supabase, organizationId),
    getAttendanceForDate(supabase, employeeId, today),
    loadMonthAttendance(supabase, employeeId, month, year),
    loadMonthLeaves(supabase, employeeId, month, year),
    loadMonthHolidays(supabase, organizationId, month, year),
    loadWeekendRules(supabase, organizationId),
    buildProfileCard(supabase, profile),
  ]);

  const corrections = await loadMonthCorrections(
    supabase,
    employeeId,
    monthRows.map((row) => row.id),
  );

  const attendanceByDate = new Map(
    monthRows.map((row) => [row.attendance_date, row]),
  );
  const holidayByDate = new Map(
    holidays.map((row) => [row.holiday_date as string, row.name as string]),
  );
  const leaveByDate = new Map<string, string>();
  for (const leave of leaves) {
    const leaveType = unwrap(
      leave.leave_types as { name: string } | { name: string }[] | null,
    );
    expandDateRange(leave.start_date, leave.end_date).forEach((date) => {
      leaveByDate.set(date, leaveType?.name ?? "Leave");
    });
  }

  const correctionsByAttendanceId = new Map<string, CorrectionRow>();
  for (const correction of corrections) {
    if (!correctionsByAttendanceId.has(correction.attendance_id)) {
      correctionsByAttendanceId.set(correction.attendance_id, correction);
    }
  }

  const calendarDays = buildCalendarDays({
    month,
    year,
    today,
    attendanceByDate,
    holidayByDate,
    leaveByDate,
    weekendRules,
    rules,
  });

  const summary = buildMonthSummary(calendarDays, monthRows, rules, today);
  const history = buildHistoryRows({
    month,
    year,
    today,
    attendanceByDate,
    correctionsByAttendanceId,
    holidayByDate,
    leaveByDate,
    weekendRules,
    rules,
    status: params.status,
    searchDate: params.searchDate,
    page: params.page,
    pageSize: params.pageSize,
  });

  const selectedDate = params.date ?? null;
  const selectedDay = selectedDate
    ? calendarDays.find((day) => day.date === selectedDate) ?? null
    : null;

  return {
    today: buildTodayPanel(
      todayRow,
      today,
      rules,
      shouldEnforceCheckInLock(profile),
    ),
    calendarDays,
    profileCard,
    summary,
    history,
    month,
    year,
    selectedDate,
    selectedDay,
  };
}

export async function punchManagerAttendance(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ManagerAttendancePunchInput,
) {
  const today = getTodayDateString();
  const employeeId = profile.employee.id;
  const rules = await getOrganizationAttendanceRules(
    supabase,
    profile.employee.organizationId,
  );

  if (
    shouldEnforceCheckInLock(profile) &&
    isCheckInLockedNow(today) &&
    input.type === "in"
  ) {
    throw new Error(
      `Check-in locked. Check-in closes at ${formatAttendanceTime(
        `${today}T${OFFICE_CHECK_IN_LOCK_TIME}:00+05:30`,
      )}.`,
    );
  }

  const existing = await getAttendanceForDate(supabase, employeeId, today);
  const nowIso = new Date().toISOString();
  const geoNote =
    input.latitude != null && input.longitude != null
      ? `geo:${input.latitude},${input.longitude}`
      : null;

  if (input.type === "in") {
    if (existing?.check_in_at) {
      throw new Error("You have already checked in today.");
    }

    const status = resolvePunchStatus(nowIso, null, today, rules);
    const branchId = await getEmployeeBranchId(supabase, employeeId);

    if (existing) {
      const { error } = await supabase
        .schema("hrms")
        .from("attendance")
        .update({
          check_in_at: nowIso,
          attendance_status: status,
          notes: geoNote ?? existing.notes,
          updated_by: profile.userId,
        })
        .eq("id", existing.id);

      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .schema("hrms")
        .from("attendance")
        .insert({
          organization_id: profile.employee.organizationId,
          branch_id: branchId,
          employee_id: employeeId,
          attendance_date: today,
          check_in_at: nowIso,
          check_out_at: null,
          attendance_status: status,
          work_hours: 0,
          overtime_hours: 0,
          notes: geoNote,
          status: "active",
          created_by: profile.userId,
          updated_by: profile.userId,
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Attendance already exists for today.");
        }
        throw new Error(error.message);
      }
    }

    await writeApplicationAudit(supabase, {
      organizationId: profile.employee.organizationId,
      module: "attendance",
      action: "check_in",
      description: `Manager checked in on ${today}`,
      recordId: employeeId,
      metadata: { attendanceDate: today, type: "in" },
    });

    await notifyAttendanceCheckedIn(supabase, profile, today);
    return;
  }

  if (!existing?.check_in_at) {
    throw new Error("Check in before checking out.");
  }

  if (parseISO(nowIso).getTime() < parseISO(existing.check_in_at).getTime()) {
    throw new Error("Checkout cannot be before check-in.");
  }

  const workHours = computeWorkHours(existing.check_in_at, nowIso);
  const overtimeHours = computeOvertimeHours(workHours, rules);
  const status = resolvePunchStatus(
    existing.check_in_at,
    nowIso,
    today,
    rules,
  );

  const { error } = await supabase
    .schema("hrms")
    .from("attendance")
    .update({
      check_out_at: nowIso,
      work_hours: workHours,
      overtime_hours: overtimeHours,
      attendance_status: status,
      notes: geoNote ?? existing.notes,
      updated_by: profile.userId,
    })
    .eq("id", existing.id);

  if (error) throw new Error(error.message);

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "attendance",
    action: existing.check_out_at ? "update_checkout" : "check_out",
    description: existing.check_out_at
      ? `Manager updated checkout on ${today}`
      : `Manager checked out on ${today}`,
    recordId: existing.id,
    metadata: {
      attendanceDate: today,
      workHours,
      overtimeHours,
    },
  });

  if (existing.check_out_at) {
    await notifyAttendanceCheckoutUpdated(supabase, profile, today, workHours);
  } else {
    await notifyAttendanceCheckedOut(supabase, profile, today, workHours);
  }
}

export async function updateManagerCheckout(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ManagerUpdateCheckoutInput,
) {
  const today = getTodayDateString();
  // Checkout is never auto-locked by time — only today can be updated.
  const employeeId = profile.employee.id;
  const existing = input.attendanceId
    ? await getAttendanceForDate(supabase, employeeId, today).then(async (row) => {
        if (row && row.id === input.attendanceId) return row;
        const { data, error } = await supabase
          .schema("hrms")
          .from("attendance")
          .select(
            "id, attendance_date, check_in_at, check_out_at, attendance_status, work_hours, overtime_hours, notes",
          )
          .eq("id", input.attendanceId)
          .eq("employee_id", employeeId)
          .is("deleted_at", null)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data;
      })
    : await getAttendanceForDate(supabase, employeeId, today);

  if (!existing?.check_in_at) {
    throw new Error("Check in before updating checkout.");
  }

  if (existing.attendance_date !== today) {
    throw new Error("Only today's checkout can be updated.");
  }

  const checkOutAt =
    input.checkOutAt && input.checkOutAt.includes("T")
      ? input.checkOutAt
      : input.checkOutAt
        ? combineDateAndTime(today, input.checkOutAt)
        : new Date().toISOString();

  if (!checkOutAt) {
    throw new Error("Checkout time is required.");
  }

  if (parseISO(checkOutAt).getTime() < parseISO(existing.check_in_at).getTime()) {
    throw new Error("Checkout cannot be before check-in.");
  }

  const rules = await getOrganizationAttendanceRules(
    supabase,
    profile.employee.organizationId,
  );
  const workHours = computeWorkHours(existing.check_in_at, checkOutAt);
  const overtimeHours = computeOvertimeHours(workHours, rules);
  const status = resolvePunchStatus(
    existing.check_in_at,
    checkOutAt,
    today,
    rules,
  );

  const { error } = await supabase
    .schema("hrms")
    .from("attendance")
    .update({
      check_out_at: checkOutAt,
      work_hours: workHours,
      overtime_hours: overtimeHours,
      attendance_status: status,
      updated_by: profile.userId,
    })
    .eq("id", existing.id);

  if (error) throw new Error(error.message);

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "attendance",
    action: "update_checkout",
    description: `Manager updated checkout on ${today}`,
    recordId: existing.id,
    metadata: { attendanceDate: today, workHours, overtimeHours },
  });

  await notifyAttendanceCheckoutUpdated(supabase, profile, today, workHours);
}

export async function requestManagerAttendanceRegularization(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ManagerAttendanceRegularizationInput,
) {
  const employeeId = profile.employee.id;
  let attendanceId = input.attendanceId;

  if (!attendanceId) {
    const existing = await getAttendanceForDate(
      supabase,
      employeeId,
      input.attendanceDate,
    );

    if (existing) {
      attendanceId = existing.id;
    } else {
      const branchId = await getEmployeeBranchId(supabase, employeeId);
      const { data, error } = await supabase
        .schema("hrms")
        .from("attendance")
        .insert({
          organization_id: profile.employee.organizationId,
          branch_id: branchId,
          employee_id: employeeId,
          attendance_date: input.attendanceDate,
          check_in_at: null,
          check_out_at: null,
          attendance_status: "absent",
          work_hours: 0,
          overtime_hours: 0,
          notes: null,
          status: "active",
          created_by: profile.userId,
          updated_by: profile.userId,
        })
        .select("id")
        .single();

      if (error || !data) {
        if (error?.code === "23505") {
          const retry = await getAttendanceForDate(
            supabase,
            employeeId,
            input.attendanceDate,
          );
          if (!retry) throw new Error(error.message);
          attendanceId = retry.id;
        } else {
          throw new Error(error?.message ?? "Failed to create attendance row");
        }
      } else {
        attendanceId = data.id;
      }
    }
  }

  const { data: pending, error: pendingError } = await supabase
    .schema("hrms")
    .from("attendance_corrections")
    .select("id")
    .eq("attendance_id", attendanceId)
    .eq("correction_status", "pending")
    .is("deleted_at", null)
    .maybeSingle();

  if (pendingError) throw new Error(pendingError.message);
  if (pending) {
    throw new Error("A pending regularization request already exists for this day.");
  }

  const requestedCheckInAt =
    input.requestedCheckInAt && !input.requestedCheckInAt.includes("T")
      ? combineDateAndTime(input.attendanceDate, input.requestedCheckInAt)
      : input.requestedCheckInAt ?? null;
  const requestedCheckOutAt =
    input.requestedCheckOutAt && !input.requestedCheckOutAt.includes("T")
      ? combineDateAndTime(input.attendanceDate, input.requestedCheckOutAt)
      : input.requestedCheckOutAt ?? null;

  if (
    requestedCheckInAt &&
    requestedCheckOutAt &&
    parseISO(requestedCheckOutAt).getTime() <
      parseISO(requestedCheckInAt).getTime()
  ) {
    throw new Error("Requested checkout cannot be before check-in.");
  }

  const { data: correction, error } = await supabase
    .schema("hrms")
    .from("attendance_corrections")
    .insert({
      attendance_id: attendanceId,
      employee_id: employeeId,
      requested_check_in_at: requestedCheckInAt,
      requested_check_out_at: requestedCheckOutAt,
      reason: input.reason.trim(),
      correction_status: "pending",
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !correction) {
    throw new Error(error?.message ?? "Failed to create regularization request");
  }

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "attendance",
    action: "request_regularization",
    description: `Manager requested attendance regularization for ${input.attendanceDate}`,
    recordId: correction.id,
    metadata: {
      attendanceId,
      attendanceDate: input.attendanceDate,
    },
  });

  await notifyAttendanceRegularizationRequested(
    supabase,
    profile,
    correction.id,
    input.attendanceDate,
  );

  return correction.id;
}
