import { differenceInSeconds, parseISO } from "date-fns";

/** Decimal hours (e.g. 7.5) -> "7h 30m". Client-safe (no server imports). */
export function formatHoursLabel(hours: number) {
  const safe = Math.max(0, hours);
  const wholeHours = Math.floor(safe);
  const minutes = Math.round((safe - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

/** Seconds -> "0h 0m" / "7h 5m". */
export function formatWorkingDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/** Minutes late -> "45m", "1 Hour", "1 hr 1m", "3 hr 7m", etc. */
export function formatLateByLabel(totalMinutes: number) {
  const safe = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  if (hours === 1 && minutes === 0) return "1 Hour";
  if (hours > 1 && minutes === 0) return `${hours} hr`;
  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Working seconds from check-in → checkout (or `now` while still checked in).
 * Wall-clock only — no idle / activity detection.
 */
export function elapsedWorkingSeconds(
  checkInAt: string | null,
  checkOutAt: string | null,
  now: Date = new Date(),
) {
  if (!checkInAt) return 0;
  const end = checkOutAt ? parseISO(checkOutAt) : now;
  return Math.max(0, differenceInSeconds(end, parseISO(checkInAt)));
}

/** Decimal hours from check-in → checkout. Open sessions are 0 until checkout. */
export function workHoursFromCheckInOut(
  checkInAt: string | null | undefined,
  checkOutAt: string | null | undefined,
) {
  if (!checkInAt || !checkOutAt) return 0;
  const seconds = elapsedWorkingSeconds(checkInAt, checkOutAt);
  if (seconds <= 0) return 0;
  return Math.round((seconds / 3600) * 100) / 100;
}

export type ApplicableWorkingDay = {
  inMonth: boolean;
  isFuture: boolean;
  isToday?: boolean;
  status: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
};

function isApplicableWorkingDay(day: ApplicableWorkingDay) {
  if (!day.inMonth || day.isFuture) return false;
  if (day.status === "holiday" || day.status === "week_off") return false;
  if (day.status === "on_leave") return false;
  if (day.status == null || day.status === "upcoming") return false;
  return Boolean(day.checkInAt);
}

function secondsForApplicableDay(
  day: ApplicableWorkingDay,
  liveTodaySeconds: number | undefined,
) {
  if (!day.checkInAt) return 0;
  if (day.isToday && !day.checkOutAt && liveTodaySeconds != null) {
    return Math.max(0, Math.floor(liveTodaySeconds));
  }
  return elapsedWorkingSeconds(day.checkInAt, day.checkOutAt);
}

/**
 * Average wall-clock seconds across days that actually have a check-in.
 * Holidays, weekend offs, future dates, leave, and no-show days are excluded
 * so Avg Hours matches today's working hours when that is the only worked day.
 */
export function averageApplicableWorkingSeconds(
  days: readonly ApplicableWorkingDay[],
  liveTodaySeconds?: number,
) {
  const applicable = days.filter(isApplicableWorkingDay);
  if (applicable.length === 0) return 0;
  const total = applicable.reduce(
    (sum, day) => sum + secondsForApplicableDay(day, liveTodaySeconds),
    0,
  );
  return Math.floor(total / applicable.length);
}

export function averageApplicableWorkingHours(
  days: readonly ApplicableWorkingDay[],
  liveTodaySeconds?: number,
) {
  const seconds = averageApplicableWorkingSeconds(days, liveTodaySeconds);
  if (seconds <= 0) return 0;
  return Math.round((seconds / 3600) * 100) / 100;
}
