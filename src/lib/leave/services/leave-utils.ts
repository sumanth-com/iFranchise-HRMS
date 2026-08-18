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

export function getMonthDateRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
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

