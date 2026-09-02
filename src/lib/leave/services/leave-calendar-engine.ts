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
  holidays: string[];
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
  return new Set(calendar.holidays);
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

function isSandwichBridge(dayClass: LeaveDayClass, sandwich: LeaveSandwichRules): boolean {
  if (dayClass === "half_day") return true;
  if (dayClass === "weekly_off") return sandwich.includeWeekends;
  if (dayClass === "holiday") return sandwich.includeHolidays;
  return false;
}

function isSandwichCountable(dayClass: LeaveDayClass, sandwich: LeaveSandwichRules): boolean {
  if (dayClass === "weekly_off") return sandwich.includeWeekends;
  if (dayClass === "holiday") return sandwich.includeHolidays;
  return false;
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
    const days: LeaveDurationDay[] = [
      {
        date,
        kind: "working",
        class: dayClass,
        counted: 1,
        inRequestedRange: true,
      },
    ];
    return {
      startDate: input.startDate,
      endDate: input.endDate,
      requestedDates,
      workingDays: 1,
      halfDays: 0,
      weeklyHolidays: dayClass === "weekly_off" ? 1 : 0,
      publicHolidays: dayClass === "holiday" ? 1 : 0,
      sandwichDays: 0,
      totalLeaveDays: 1,
      days,
      sandwichExplanations: [],
    };
  }

  const leaveTouching = new Set(
    requestedDates.filter((date) => {
      const dayClass = classifyCalendarDay(date, calendar);
      return dayClass === "working" || dayClass === "half_day";
    }),
  );

  const sandwichDates = new Set<string>();
  if (calendar.sandwich.enabled && leaveTouching.size > 0) {
    const visit = (seed: string, direction: 1 | -1) => {
      let current = addDays(parseISO(seed), direction);
      for (let i = 0; i < 14; i += 1) {
        const date = format(current, "yyyy-MM-dd");
        const dayClass = classifyCalendarDay(date, calendar);
        if (!isSandwichBridge(dayClass, calendar.sandwich)) break;
        if (isSandwichCountable(dayClass, calendar.sandwich)) {
          sandwichDates.add(date);
        }
        current = addDays(current, direction);
      }
    };

    for (const date of leaveTouching) {
      visit(date, -1);
      visit(date, 1);
    }

    for (const date of requestedDates) {
      const dayClass = classifyCalendarDay(date, calendar);
      if (isSandwichCountable(dayClass, calendar.sandwich)) {
        sandwichDates.add(date);
      }
    }
  }

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

    if (sandwichDates.has(date) && isSandwichCountable(dayClass, calendar.sandwich)) {
      days.push({
        date,
        kind: "sandwich",
        class: dayClass,
        counted: 1,
        inRequestedRange,
        note: `${formatDayLabel(date)} is added under Sandwich Leave Policy because it sits between your leave and a working day.`,
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
