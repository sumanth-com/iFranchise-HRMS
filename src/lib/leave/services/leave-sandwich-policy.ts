import {
  addDays,
  eachDayOfInterval,
  format,
  parseISO,
} from "date-fns";

import type { LeaveCalendarContext } from "@/lib/leave/services/leave-calendar-engine";
import {
  classifyScheduleDay,
  DEFAULT_LEAVE_CALENDAR,
  isPublicHolidayDate,
} from "@/lib/leave/services/leave-calendar-engine";

function isScheduleWorkingClass(dayClass: string): boolean {
  return dayClass === "working" || dayClass === "half_day";
}

/** Next Mon–Sat schedule working/half day (skips weekly offs and declared holidays). */
export function nextScheduleWorkingDate(
  date: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): string | null {
  let current = addDays(parseISO(date), 1);
  for (let step = 0; step < 366; step += 1) {
    const iso = format(current, "yyyy-MM-dd");
    if (isPublicHolidayDate(iso, calendar)) {
      current = addDays(current, 1);
      continue;
    }
    const schedule = classifyScheduleDay(iso, calendar);
    if (isScheduleWorkingClass(schedule)) return iso;
    if (schedule === "weekly_off") {
      current = addDays(current, 1);
      continue;
    }
    current = addDays(current, 1);
  }
  return null;
}

/** Previous Mon–Sat schedule working/half day (skips weekly offs and declared holidays). */
export function previousScheduleWorkingDate(
  date: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): string | null {
  let current = addDays(parseISO(date), -1);
  for (let step = 0; step < 366; step += 1) {
    const iso = format(current, "yyyy-MM-dd");
    if (isPublicHolidayDate(iso, calendar)) {
      current = addDays(current, -1);
      continue;
    }
    const schedule = classifyScheduleDay(iso, calendar);
    if (isScheduleWorkingClass(schedule)) return iso;
    if (schedule === "weekly_off") {
      current = addDays(current, -1);
      continue;
    }
    current = addDays(current, -1);
  }
  return null;
}

/**
 * Working days the employee selected as leave within the requested date range.
 * Declared public holidays are never leave days and never sandwich days.
 */
export function absenceLeaveDatesForRange(
  requestedDates: string[],
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): Set<string> {
  if (requestedDates.length === 0) return new Set();

  const dates = new Set<string>();

  for (const date of requestedDates) {
    const schedule = classifyScheduleDay(date, calendar);
    if (!isScheduleWorkingClass(schedule)) continue;

    if (isPublicHolidayDate(date, calendar)) {
      continue;
    }

    dates.add(date.slice(0, 10));
  }

  return dates;
}

export function isSandwichInterveningDay(
  date: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): boolean {
  if (isPublicHolidayDate(date, calendar)) {
    return false;
  }
  return (
    calendar.sandwich.enabled &&
    calendar.sandwich.includeWeekends &&
    classifyScheduleDay(date, calendar) === "weekly_off"
  );
}

/**
 * Weekly-off sandwich: a weekly off after an actual absence is included.
 * Leave on Saturday → the following Sunday counts.
 * Leave that starts on Monday does not charge the previous Sunday.
 *
 * Declared public holidays are never sandwich leave or sandwich LOP.
 */
export function sandwichedInterveningDates(
  absenceLeaveDates: Set<string>,
  spanStart: string,
  spanEnd: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): Set<string> {
  const sandwiched = new Set<string>();
  if (!calendar.sandwich.enabled || absenceLeaveDates.size === 0) {
    return sandwiched;
  }

  // Expand the scan window so Sat-only / Mon-only leave still sees the adjacent Sunday.
  let scanStart = spanStart;
  let scanEnd = spanEnd;
  for (const leaveDate of absenceLeaveDates) {
    for (const delta of [-1, 1] as const) {
      const neighbor = format(addDays(parseISO(leaveDate), delta), "yyyy-MM-dd");
      if (!isSandwichInterveningDay(neighbor, calendar)) continue;
      if (neighbor < scanStart) scanStart = neighbor;
      if (neighbor > scanEnd) scanEnd = neighbor;
    }
  }

  for (const day of eachDayOfInterval({
    start: parseISO(scanStart),
    end: parseISO(scanEnd),
  })) {
    const iso = format(day, "yyyy-MM-dd");
    if (!isSandwichInterveningDay(iso, calendar)) continue;

    const schedule = classifyScheduleDay(iso, calendar);
    const isWeeklyOff = schedule === "weekly_off" && calendar.sandwich.includeWeekends;

    if (isPublicHolidayDate(iso, calendar)) continue;

    if (isWeeklyOff) {
      const before = previousScheduleWorkingDate(iso, calendar);
      const beforeHit = Boolean(before && absenceLeaveDates.has(before));
      if (beforeHit) sandwiched.add(iso);
    }
  }

  return sandwiched;
}

/**
 * Resumption-of-duty rule for unpaid/LOP absences: if the employee did not resume
 * on an intermediate schedule-working day before a weekly off, that weekly off
 * is also treated as unpaid (LOP).
 */
export function unpaidAbsenceWeeklyOffDates(
  occupiedAbsenceDates: Set<string>,
  spanStart: string,
  spanEnd: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): Set<string> {
  const unpaidWeeklyOffs = new Set<string>();
  if (!calendar.sandwich.enabled || occupiedAbsenceDates.size === 0) {
    return unpaidWeeklyOffs;
  }

  let scanStart = spanStart;
  let scanEnd = spanEnd;
  for (const leaveDate of occupiedAbsenceDates) {
    for (const delta of [-1, 1] as const) {
      const neighbor = format(addDays(parseISO(leaveDate), delta), "yyyy-MM-dd");
      if (classifyScheduleDay(neighbor, calendar) !== "weekly_off") continue;
      if (neighbor < scanStart) scanStart = neighbor;
      if (neighbor > scanEnd) scanEnd = neighbor;
    }
  }

  for (const day of eachDayOfInterval({
    start: parseISO(scanStart),
    end: parseISO(scanEnd),
  })) {
    const iso = format(day, "yyyy-MM-dd");
    if (isPublicHolidayDate(iso, calendar)) continue;
    if (classifyScheduleDay(iso, calendar) !== "weekly_off") continue;

    const previousWorking = previousScheduleWorkingDate(iso, calendar);
    if (!previousWorking || !occupiedAbsenceDates.has(previousWorking)) continue;

    let resumedBeforeWeeklyOff = false;
    let cursor = addDays(parseISO(previousWorking), 1);
    const weeklyOffDate = parseISO(iso);

    while (cursor < weeklyOffDate) {
      const between = format(cursor, "yyyy-MM-dd");
      const schedule = classifyScheduleDay(between, calendar);
      if (isScheduleWorkingClass(schedule) && !occupiedAbsenceDates.has(between)) {
        resumedBeforeWeeklyOff = true;
        break;
      }
      cursor = addDays(cursor, 1);
    }

    if (!resumedBeforeWeeklyOff) {
      unpaidWeeklyOffs.add(iso);
    }
  }

  return unpaidWeeklyOffs;
}
