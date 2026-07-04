import {
  addDays,
  eachDayOfInterval,
  format,
  getDay,
  parseISO,
} from "date-fns";

import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import type { HalfDayPeriod } from "@/types/leave";

export function calculateLeaveTotalDays(
  startDate: string,
  endDate: string,
  isHalfDay: boolean,
): number {
  if (isHalfDay) {
    return 0.5;
  }

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days = eachDayOfInterval({ start, end });

  const workingDays = days.filter((day) => {
    const dow = getDay(day);
    return dow !== 0 && dow !== 6;
  });

  return workingDays.length;
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

export function isWeekendDate(date: string) {
  const dow = getDay(parseISO(date));
  return dow === 0 || dow === 6;
}

export function expandDateRange(startDate: string, endDate: string) {
  return eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  }).map((day) => format(day, "yyyy-MM-dd"));
}

export function getNextBusinessDay(date: string) {
  let current = parseISO(date);
  while (getDay(current) === 0 || getDay(current) === 6) {
    current = addDays(current, 1);
  }
  return format(current, "yyyy-MM-dd");
}
