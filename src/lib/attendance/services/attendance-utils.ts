import { differenceInMinutes, parseISO } from "date-fns";

export const OFFICE_TIMEZONE = "Asia/Kolkata";
export const OFFICE_CHECK_IN_TIME = "10:00";
export const OFFICE_CHECK_OUT_TIME = "19:00";

export function getTodayDateString(timeZone = OFFICE_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export type AttendanceRules = {
  lateAfter: string;
  fullDayMinimumHours: number;
  halfDayMinimumHours: number;
};

export const DEFAULT_ATTENDANCE_RULES: AttendanceRules = {
  lateAfter: "10:05",
  fullDayMinimumHours: 8,
  halfDayMinimumHours: 4,
};

export function parseAttendanceRules(
  settings: Record<string, unknown> | null | undefined,
): AttendanceRules {
  const rules = settings?.attendance_rules;

  if (!rules || typeof rules !== "object") {
    return DEFAULT_ATTENDANCE_RULES;
  }

  const attendanceRules = rules as Record<string, unknown>;

  return {
    lateAfter:
      typeof attendanceRules.late_after === "string"
        ? attendanceRules.late_after
        : DEFAULT_ATTENDANCE_RULES.lateAfter,
    fullDayMinimumHours:
      typeof attendanceRules.full_day_minimum_hours === "number"
        ? attendanceRules.full_day_minimum_hours
        : DEFAULT_ATTENDANCE_RULES.fullDayMinimumHours,
    halfDayMinimumHours:
      typeof attendanceRules.half_day_minimum_hours === "number"
        ? attendanceRules.half_day_minimum_hours
        : DEFAULT_ATTENDANCE_RULES.halfDayMinimumHours,
  };
}

export function combineDateAndTime(date: string, time?: string | null): string | null {
  if (!time?.trim()) return null;
  return `${date}T${time}:00+05:30`;
}

export function formatAttendanceTime(value?: string | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: OFFICE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parseISO(value));
}

export function extractTimeFromTimestamp(value?: string | null): string {
  if (!value) return "";

  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: OFFICE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parseISO(value));

  return formatted;
}

export function computeWorkHours(
  checkInAt?: string | null,
  checkOutAt?: string | null,
): number {
  if (!checkInAt || !checkOutAt) return 0;

  const minutes = differenceInMinutes(parseISO(checkOutAt), parseISO(checkInAt));
  if (minutes <= 0) return 0;

  return Math.round((minutes / 60) * 100) / 100;
}

export function computeLateMinutes(
  checkInAt: string | null | undefined,
  attendanceDate: string,
  lateAfter: string,
): number {
  if (!checkInAt) return 0;

  const [hours, minutes] = lateAfter.split(":").map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;

  const threshold = parseISO(
    `${attendanceDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`,
  );
  const checkIn = parseISO(checkInAt);
  const diff = differenceInMinutes(checkIn, threshold);

  return diff > 0 ? diff : 0;
}
