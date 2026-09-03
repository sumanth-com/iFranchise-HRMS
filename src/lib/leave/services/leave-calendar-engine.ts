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
  /** Official National / Festival holidays — never sandwich or LOP. */
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
  includeHolidays: false,
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
 * Weekly offs inside a continuous absence period are sandwiched.
 *
 * A period is a run of absent working days connected across weekly offs.
 * Unoccupied working days (including 2nd/4th Saturdays) close the period.
 * Official holidays and approved optional holidays are skipped: they never
 * become sandwich/LOP and they do not by themselves close the period.
 * Leading/trailing weekly offs with absence on only one side are ignored.
 */
export function sandwichWeeklyOffDates(
  absenceWorkingDates: Iterable<string>,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): Set<string> {
  const sandwichDates = new Set<string>();
  if (!calendar.sandwich.enabled || !calendar.sandwich.includeWeekends) {
    return sandwichDates;
  }

  const occupied = [...new Set([...absenceWorkingDates].map((date) => date.slice(0, 10)))].sort();
  if (occupied.length === 0) return sandwichDates;

  const window = eachDayOfInterval({
    start: addDays(parseISO(occupied[0]!), -1),
    end: addDays(parseISO(occupied[occupied.length - 1]!), 8),
  }).map((day) => format(day, "yyyy-MM-dd"));

  const occupiedSet = new Set(occupied);
  let occupiedInPeriod = 0;
  let pendingWeeklyOffs: string[] = [];

  for (const date of window) {
    const dayClass = classifyCalendarDay(date, calendar);

    if (dayClass === "holiday") {
      continue;
    }

    if (isAbsenceWorkingClass(dayClass)) {
      if (occupiedSet.has(date)) {
        for (const weeklyOff of pendingWeeklyOffs) sandwichDates.add(weeklyOff);
        pendingWeeklyOffs = [];
        occupiedInPeriod += 1;
      } else {
        pendingWeeklyOffs = [];
        occupiedInPeriod = 0;
      }
      continue;
    }

    if (dayClass === "weekly_off" && occupiedInPeriod > 0) {
      pendingWeeklyOffs.push(date);
    }
  }

  return sandwichDates;
}

/** Weekly offs in a continuous absence that leave duration has not already counted. */
export function extraSandwichLopDays(
  occupiedWorkingDates: Iterable<string>,
  alreadyCountedSandwichDates: Iterable<string> = [],
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): number {
  const counted = new Set(
    [...alreadyCountedSandwichDates].map((date) => date.slice(0, 10)),
  );
  let extra = 0;
  for (const date of sandwichWeeklyOffDates(occupiedWorkingDates, calendar)) {
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

  const leaveTouching = new Set(
    requestedDates.filter((date) => isAbsenceWorkingClass(classifyCalendarDay(date, calendar))),
  );

  const sandwichDates = sandwichWeeklyOffDates(leaveTouching, calendar);

  const days: LeaveDurationDay[] = [];
  const seen = new Set<string>();
  const allDates = [...requestedDates, ...sandwichDates].sort();

  for (const date of allDates) {
    if (seen.has(date)) continue;
    seen.add(date);
    const dayClass = classifyCalendarDay(date, calendar);
    const inRequestedRange = requestedDates.includes(date);

    if (dayClass === "working" && inRequestedRange) {
      days.push({
        date,
        kind: "working",
        class: dayClass,
        counted: 1,
        inRequestedRange,
      });
      continue;
    }

    if (dayClass === "half_day" && inRequestedRange) {
      days.push({
        date,
        kind: "working",
        class: dayClass,
        counted: 1,
        inRequestedRange,
      });
      continue;
    }

    if (sandwichDates.has(date) && dayClass === "weekly_off") {
      days.push({
        date,
        kind: "sandwich",
        class: dayClass,
        counted: 1,
        inRequestedRange,
        note: `${formatDayLabel(date)} is counted under the sandwich rule because you were absent or on leave on both adjacent working days. Official holidays are not deducted.`,
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
