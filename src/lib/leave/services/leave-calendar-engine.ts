import {
  absenceLeaveDatesForRange,
  sandwichedInterveningDates,
  unpaidAbsenceWeeklyOffDates,
} from "@/lib/leave/services/leave-sandwich-policy";

import {
  addDays,
  eachDayOfInterval,
  format,
  getDate,
  getDay,
  parseISO,
} from "date-fns";

export type LeaveDayClass = "working" | "half_day" | "weekly_off" | "holiday";

export type LeaveCountedKind =
  | "working"
  | "half_day"
  | "weekly_holiday"
  | "public_holiday"
  | "sandwich";

export type LeaveWeekendRule = "off" | "working" | "half_day" | "nth_half";

export type LeaveWeekendRules = {
  saturday: LeaveWeekendRule;
  sunday: LeaveWeekendRule;
  saturdayHalfDayWeeks: number[];
};

export type LeaveSandwichRules = {
  enabled: boolean;
  includeWeekends: boolean;
  includeHolidays: boolean;
};

export type LeaveCalendarContext = {
  /** Official National / Festival holidays configured for the organization. */
  holidays: string[];
  /**
   * Dates that are non-working only for this employee (approved Optional Holiday).
   * Treated like official holidays for sandwich: never deducted, skipped when
   * finding adjacent working days.
   */
  employeeNonWorkingDates?: string[];
  weekendRules: LeaveWeekendRules;
  sandwich: LeaveSandwichRules;
};

export type LeaveDurationDay = {
  date: string;
  kind: LeaveCountedKind;
  class: LeaveDayClass;
  counted: number;
  inRequestedRange: boolean;
  note?: string;
};

export type LeaveDurationBreakdown = {
  startDate: string;
  endDate: string;
  requestedDates: string[];
  workingDays: number;
  halfDays: number;
  weeklyHolidays: number;
  publicHolidays: number;
  sandwichDays: number;
  totalLeaveDays: number;
  days: LeaveDurationDay[];
  sandwichExplanations: string[];
};

export const DEFAULT_LEAVE_WEEKEND_RULES: LeaveWeekendRules = {
  saturday: "nth_half",
  sunday: "off",
  saturdayHalfDayWeeks: [2, 4],
};

export const DEFAULT_LEAVE_SANDWICH_RULES: LeaveSandwichRules = {
  enabled: true,
  includeWeekends: true,
  includeHolidays: true,
};

export const DEFAULT_LEAVE_CALENDAR: LeaveCalendarContext = {
  holidays: [],
  weekendRules: DEFAULT_LEAVE_WEEKEND_RULES,
  sandwich: DEFAULT_LEAVE_SANDWICH_RULES,
};

function holidaySet(calendar: LeaveCalendarContext): Set<string> {
  const dates = [...calendar.holidays, ...(calendar.employeeNonWorkingDates ?? [])];
  return new Set(dates.map((date) => date.slice(0, 10)));
}

export function isPublicHolidayDate(
  date: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): boolean {
  return holidaySet(calendar).has(date.slice(0, 10));
}

/** Weekday/weekend schedule ignoring declared public holidays. */
export function classifyScheduleDay(
  date: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): LeaveDayClass {
  const dow = getDay(parseISO(date));
  const { saturday, sunday, saturdayHalfDayWeeks } = calendar.weekendRules;

  if (dow === 0) {
    if (sunday === "working") return "working";
    if (sunday === "half_day") return "half_day";
    return "weekly_off";
  }

  if (dow === 6) {
    if (saturday === "off") return "weekly_off";
    if (saturday === "half_day") return "half_day";
    if (saturday === "nth_half") {
      const weeks =
        saturdayHalfDayWeeks.length > 0
          ? saturdayHalfDayWeeks
          : DEFAULT_LEAVE_WEEKEND_RULES.saturdayHalfDayWeeks;
      return weeks.includes(saturdayOrdinalInMonth(date)) ? "half_day" : "working";
    }
    return "working";
  }

  return "working";
}

export function calendarWithEmployeeNonWorkingDates(
  calendar: LeaveCalendarContext,
  dates: string[],
): LeaveCalendarContext {
  return {
    ...calendar,
    employeeNonWorkingDates: dates.map((date) => date.slice(0, 10)),
  };
}

/** 1-based Saturday ordinal in the month (1st, 2nd, … Saturday). */
export function saturdayOrdinalInMonth(date: string): number {
  return Math.ceil(getDate(parseISO(date)) / 7);
}

export function classifyCalendarDay(
  date: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): LeaveDayClass {
  if (holidaySet(calendar).has(date)) return "holiday";

  const dow = getDay(parseISO(date));
  const { saturday, sunday, saturdayHalfDayWeeks } = calendar.weekendRules;

  if (dow === 0) {
    if (sunday === "working") return "working";
    if (sunday === "half_day") return "half_day";
    return "weekly_off";
  }

  if (dow === 6) {
    if (saturday === "off") return "weekly_off";
    if (saturday === "half_day") return "half_day";
    if (saturday === "nth_half") {
      const weeks =
        saturdayHalfDayWeeks.length > 0
          ? saturdayHalfDayWeeks
          : DEFAULT_LEAVE_WEEKEND_RULES.saturdayHalfDayWeeks;
      return weeks.includes(saturdayOrdinalInMonth(date)) ? "half_day" : "working";
    }
    return "working";
  }

  return "working";
}

export function isWeeklyHolidayDate(
  date: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): boolean {
  return classifyCalendarDay(date, calendar) === "weekly_off";
}

export function isHalfDayCalendarDate(
  date: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): boolean {
  return classifyCalendarDay(date, calendar) === "half_day";
}

function isAbsenceWorkingClass(dayClass: LeaveDayClass): boolean {
  return dayClass === "working" || dayClass === "half_day";
}

/**
 * Weekly offs (and public holidays when enabled) sandwiched between leave days.
 * Delegates to the strict immediate-neighbour policy in leave-sandwich-policy.
 */
export function sandwichWeeklyOffDates(
  absenceWorkingDates: Iterable<string>,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): Set<string> {
  const occupied = [...new Set([...absenceWorkingDates].map((date) => date.slice(0, 10)))].sort();
  if (occupied.length === 0) return new Set();

  return sandwichedInterveningDates(
    new Set(occupied),
    occupied[0]!,
    occupied[occupied.length - 1]!,
    calendar,
  );
}

/** Weekly offs in a continuous absence that leave duration has not already counted. */
export function extraSandwichLopDays(
  occupiedWorkingDates: Iterable<string>,
  alreadyCountedSandwichDates: Iterable<string> = [],
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): number {
  const occupied = [...new Set([...occupiedWorkingDates].map((date) => date.slice(0, 10)))].sort();
  if (occupied.length === 0) return 0;

  const spanStart = occupied[0]!;
  const spanEnd = occupied[occupied.length - 1]!;
  const occupiedSet = new Set(occupied);
  const counted = new Set(
    [...alreadyCountedSandwichDates].map((date) => date.slice(0, 10)),
  );

  const candidates = new Set<string>([
    ...sandwichWeeklyOffDates(occupied, calendar),
    ...unpaidAbsenceWeeklyOffDates(occupiedSet, spanStart, spanEnd, calendar),
  ]);

  let extra = 0;
  for (const date of candidates) {
    if (!counted.has(date)) extra += 1;
  }
  return extra;
}

function formatDayLabel(date: string): string {
  return format(parseISO(date), "EEEE d MMM");
}

export function calculateLeaveDuration(input: {
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  calendar?: LeaveCalendarContext;
}): LeaveDurationBreakdown {
  const calendar = input.calendar ?? DEFAULT_LEAVE_CALENDAR;
  const requestedDates = eachDayOfInterval({
    start: parseISO(input.startDate),
    end: parseISO(input.endDate),
  }).map((day) => format(day, "yyyy-MM-dd"));

  if (input.isHalfDay) {
    const date = input.startDate;
    const dayClass = classifyCalendarDay(date, calendar);
    const countable = isAbsenceWorkingClass(dayClass);
    const days: LeaveDurationDay[] = [
      {
        date,
        kind: countable ? "half_day" : dayClass === "holiday" ? "public_holiday" : "weekly_holiday",
        class: dayClass,
        counted: countable ? 0.5 : 0,
        inRequestedRange: true,
      },
    ];
    return {
      startDate: input.startDate,
      endDate: input.endDate,
      requestedDates,
      workingDays: 0,
      halfDays: countable ? 1 : 0,
      weeklyHolidays: dayClass === "weekly_off" ? 1 : 0,
      publicHolidays: dayClass === "holiday" ? 1 : 0,
      sandwichDays: 0,
      totalLeaveDays: countable ? 0.5 : 0,
      days,
      sandwichExplanations: [],
    };
  }

  const absenceLeaveDates = absenceLeaveDatesForRange(requestedDates, calendar);
  const spanStart = requestedDates[0]!;
  const spanEnd = requestedDates[requestedDates.length - 1]!;
  const sandwichDates = sandwichedInterveningDates(
    absenceLeaveDates,
    spanStart,
    spanEnd,
    calendar,
  );

  const days: LeaveDurationDay[] = [];
  const seen = new Set<string>();
  const allDates = [...requestedDates, ...sandwichDates].sort();

  for (const date of allDates) {
    if (seen.has(date)) continue;
    seen.add(date);
    const dayClass = classifyCalendarDay(date, calendar);
    const inRequestedRange = requestedDates.includes(date);

    if (sandwichDates.has(date)) {
      days.push({
        date,
        kind: "sandwich",
        class: dayClass,
        counted: 1,
        inRequestedRange,
        note: isPublicHolidayDate(date, calendar)
          ? `${formatDayLabel(date)} is counted as a sandwich public holiday because leave was applied on both adjacent working days.`
          : `${formatDayLabel(date)} is counted under the sandwich rule because leave was applied on both adjacent working days.`,
      });
      continue;
    }

    if (absenceLeaveDates.has(date) && inRequestedRange) {
      days.push({
        date,
        kind: "working",
        class: dayClass,
        counted: 1,
        inRequestedRange,
      });
      continue;
    }

    if (inRequestedRange) {
      days.push({
        date,
        kind: dayClass === "holiday" ? "public_holiday" : "weekly_holiday",
        class: dayClass,
        counted: 0,
        inRequestedRange,
      });
    }
  }

  const workingDays = days.filter((day) => day.kind === "working").length;
  const halfDays = days.filter((day) => day.kind === "half_day").length;
  const sandwichDayRows = days.filter((day) => day.kind === "sandwich");
  // Weekly/public holiday chips should not double-count sandwich days.
  const weeklyHolidays = days.filter(
    (day) => day.class === "weekly_off" && day.kind !== "sandwich",
  ).length;
  const publicHolidays = days.filter(
    (day) => day.class === "holiday" && day.kind !== "sandwich",
  ).length;
  const totalLeaveDays = days.reduce((sum, day) => sum + day.counted, 0);

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    requestedDates,
    workingDays,
    halfDays,
    weeklyHolidays,
    publicHolidays,
    sandwichDays: sandwichDayRows.length,
    totalLeaveDays,
    days,
    sandwichExplanations: sandwichDayRows
      .map((day) => day.note)
      .filter((note): note is string => Boolean(note)),
  };
}

export function getNextWorkingDate(
  date: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): string {
  let current = parseISO(date);
  for (let i = 0; i < 14; i += 1) {
    const iso = format(current, "yyyy-MM-dd");
    const dayClass = classifyCalendarDay(iso, calendar);
    if (dayClass === "working" || dayClass === "half_day") return iso;
    current = addDays(current, 1);
  }
  return format(current, "yyyy-MM-dd");
}
