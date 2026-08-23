import { eachDayOfInterval, format, parseISO } from "date-fns";

import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import type { HalfDayPeriod } from "@/types/leave";
import {
  calculateLeaveDuration,
  DEFAULT_LEAVE_CALENDAR,
  getNextWorkingDate,
  isWeeklyHolidayDate,
  type LeaveCalendarContext,
} from "@/lib/leave/services/leave-calendar-engine";

export function calculateLeaveTotalDays(
  startDate: string,
  endDate: string,
  isHalfDay: boolean,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
): number {
  return calculateLeaveDuration({
    startDate,
    endDate,
    isHalfDay,
    calendar,
  }).totalLeaveDays;
}

export function getCurrentBalanceYear(date = getTodayDateString()) {
  return Number.parseInt(date.slice(0, 4), 10);
}

export function formatLeaveDate(value: string) {
  return format(parseISO(value), "dd MMM yyyy");
}

export function formatHalfDayPeriod(period: HalfDayPeriod | null | undefined) {
  if (!period) return null;
  return period === "morning" ? "First Half" : "Second Half";
}

const LEAVE_LIST_STATUS_RANK: Record<string, number> = {
  pending: 0,
  approved: 1,
  rejected: 2,
  cancelled: 3,
  withdrawn: 4,
};

/** Pending / not-yet-approved first, then latest applied requests at the top. */
export function sortLeaveListItemsForDisplay<
  T extends { leaveStatus: string; appliedAt: string; startDate: string },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const rankA = LEAVE_LIST_STATUS_RANK[a.leaveStatus] ?? 50;
    const rankB = LEAVE_LIST_STATUS_RANK[b.leaveStatus] ?? 50;
    if (rankA !== rankB) return rankA - rankB;
    if (a.appliedAt !== b.appliedAt) {
      return a.appliedAt < b.appliedAt ? 1 : -1;
    }
    if (a.startDate !== b.startDate) {
      return a.startDate < b.startDate ? -1 : 1;
    }
    return 0;
  });
}

export function getMonthDateRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const LEAVE_MONTH_OPTIONS = MONTH_LABELS.map((label, index) => ({
  value: index + 1,
  label,
}));

/** Locale-stable label so SSR and the client hydrate the same month string. */
export function formatLeaveMonthYear(month: number, year: number) {
  const name = MONTH_LABELS[month - 1];
  return name ? `${name} ${year}` : String(year);
}

export function isWeekendDate(
  date: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
) {
  return isWeeklyHolidayDate(date, calendar);
}

export function expandDateRange(startDate: string, endDate: string) {
  return eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  }).map((day) => format(day, "yyyy-MM-dd"));
}

export function getNextBusinessDay(
  date: string,
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
) {
  return getNextWorkingDate(date, calendar);
}

