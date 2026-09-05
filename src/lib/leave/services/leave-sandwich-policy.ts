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

function nearestAbsenceLeaveDate(
  fromDate: string,
  direction: 1 | -1,
  absenceLeaveDates: Set<string>,
  spanStart: string,
  spanEnd: string,
): string | null {
  let cursor = addDays(parseISO(fromDate), direction);
  const start = parseISO(spanStart);
  const end = parseISO(spanEnd);
  while (cursor >= start && cursor <= end) {
    const iso = format(cursor, "yyyy-MM-dd");
    if (absenceLeaveDates.has(iso)) return iso;
    cursor = addDays(cursor, direction);
  }
  return null;
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
 * Public holidays count only when explicitly selected as the first or last date
 * of the request (boundary selection). Interior public holidays become sandwich
 * days when sandwiched between other leave days.
 */
export function absenceLeaveDatesForRange(
  requestedDates: string[],
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): Set<string> {
  if (requestedDates.length === 0) return new Set();

  const first = requestedDates[0]!;
  const last = requestedDates[requestedDates.length - 1]!;
  const dates = new Set<string>();

  for (const date of requestedDates) {
    const schedule = classifyScheduleDay(date, calendar);
    if (!isScheduleWorkingClass(schedule)) continue;

    if (isPublicHolidayDate(date, calendar)) {
      if (date === first || date === last) {
        dates.add(date.slice(0, 10));
      }
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
    return calendar.sandwich.enabled;
  }
  return (
    calendar.sandwich.enabled &&
    calendar.sandwich.includeWeekends &&
    classifyScheduleDay(date, calendar) === "weekly_off"
  );
}

/**
 * Strict sandwich rule: a weekly off or public holiday is sandwiched only when
 * approved leave exists on the schedule-working days immediately before AND after it.
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

  for (const day of eachDayOfInterval({
    start: parseISO(spanStart),
    end: parseISO(spanEnd),
  })) {
    const iso = format(day, "yyyy-MM-dd");
    if (!isSandwichInterveningDay(iso, calendar)) continue;

    const schedule = classifyScheduleDay(iso, calendar);
    const isWeeklyOff = schedule === "weekly_off" && calendar.sandwich.includeWeekends;
    const isHoliday = isPublicHolidayDate(iso, calendar) && calendar.sandwich.includeHolidays;

    let before: string | null = null;
    let after: string | null = null;

    if (isWeeklyOff) {
      before = nearestAbsenceLeaveDate(iso, -1, absenceLeaveDates, spanStart, spanEnd);
      after = nearestAbsenceLeaveDate(iso, 1, absenceLeaveDates, spanStart, spanEnd);
    } else if (isHoliday) {
      before = previousScheduleWorkingDate(iso, calendar);
      after = nextScheduleWorkingDate(iso, calendar);
      if (before && !absenceLeaveDates.has(before)) before = null;
      if (after && !absenceLeaveDates.has(after)) after = null;
    }

    if (before && after) {
      sandwiched.add(iso);
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

  for (const day of eachDayOfInterval({
    start: parseISO(spanStart),
    end: parseISO(spanEnd),
  })) {
    const iso = format(day, "yyyy-MM-dd");
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
