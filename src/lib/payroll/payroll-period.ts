import { eachDayOfInterval, format, parseISO } from "date-fns";

import {
  classifyCalendarDay,
  type LeaveCalendarContext,
} from "@/lib/leave/services/leave-calendar-engine";
import { calendarDaysInYearMonth } from "@/lib/payroll/salary-structure-period";
import { PAYROLL_BUSINESS_TIMEZONE } from "@/lib/payroll/services/payslip-publication";
import { getMonthDateRange } from "@/lib/payroll/services/payroll-utils";

export type PayrollPeriodKind = "past" | "current" | "future";

export type PayrollApplicablePeriod = {
  kind: PayrollPeriodKind;
  month: number;
  year: number;
  /** Inclusive payroll period start (yyyy-MM-dd). */
  periodStart: string;
  /** Inclusive payroll period end (yyyy-MM-dd). */
  periodEnd: string;
  /** Full calendar month is complete for payroll policy purposes. */
  isClosed: boolean;
};

function businessDateString(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: PAYROLL_BUSINESS_TIMEZONE });
}

export function resolvePayrollApplicablePeriod(
  month: number,
  year: number,
  options?: {
    today?: Date;
    joiningDate?: string | null;
    exitDate?: string | null;
  },
): PayrollApplicablePeriod {
  const monthRange = getMonthDateRange(month, year);
  const todayStr = businessDateString(options?.today ?? new Date());

  let kind: PayrollPeriodKind;
  if (monthRange.startDate > todayStr) {
    kind = "future";
  } else if (monthRange.endDate < todayStr) {
    kind = "past";
  } else {
    kind = "current";
  }

  let periodStart = monthRange.startDate;
  let periodEnd =
    kind === "current" ? todayStr : kind === "future" ? monthRange.startDate : monthRange.endDate;

  if (options?.joiningDate) {
    const joined = options.joiningDate.slice(0, 10);
    if (joined > periodStart) periodStart = joined;
  }
  if (options?.exitDate) {
    const exited = options.exitDate.slice(0, 10);
    if (exited < periodEnd) periodEnd = exited;
  }

  const isClosed = kind === "past" || (kind === "current" && periodEnd >= monthRange.endDate);

  return {
    kind,
    month,
    year,
    periodStart,
    periodEnd,
    isClosed,
  };
}

/** Full-month eligible working days for daily-rate denominator (current open months). */
export function resolveFullMonthPayrollWorkingDays(
  month: number,
  year: number,
  calendar: LeaveCalendarContext,
  options?: { joiningDate?: string | null },
): number {
  const monthRange = getMonthDateRange(month, year);
  let periodStart = monthRange.startDate;
  const periodEnd = monthRange.endDate;

  if (options?.joiningDate) {
    const joined = options.joiningDate.slice(0, 10);
    if (joined > periodStart) periodStart = joined;
  }

  if (periodStart > periodEnd) return 0;
  return countPayrollEligibleWorkingDays(periodStart, periodEnd, calendar);
}

export function countPayrollEligibleWorkingDays(
  periodStart: string,
  periodEnd: string,
  calendar: LeaveCalendarContext,
): number {
  if (!periodStart || !periodEnd || periodStart > periodEnd) return 0;

  const days = eachDayOfInterval({
    start: parseISO(periodStart),
    end: parseISO(periodEnd),
  });

  let total = 0;
  for (const day of days) {
    const date = format(day, "yyyy-MM-dd");
    const dayClass = classifyCalendarDay(date, calendar);
    if (dayClass === "working") total += 1;
    else if (dayClass === "half_day") total += 0.5;
  }
  return total;
}

export function calendarDaysInApplicablePeriod(period: PayrollApplicablePeriod): number {
  if (period.periodStart > period.periodEnd) return 0;
  return eachDayOfInterval({
    start: parseISO(period.periodStart),
    end: parseISO(period.periodEnd),
  }).length;
}

export function closedMonthCalendarDays(month: number, year: number): number {
  return calendarDaysInYearMonth(month, year);
}
