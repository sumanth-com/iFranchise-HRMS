import { format, parseISO } from "date-fns";

import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";

export const OPTIONAL_HOLIDAY_CODE = "OH";
export const OPTIONAL_HOLIDAY_YEARLY_LIMIT = 2;

export type OptionalHolidayRecord = {
  id: string;
  name: string;
  date: string;
};

export type OptionalHolidayListItem = OptionalHolidayRecord & {
  day: string;
  status: "available" | "pending" | "approved" | "passed";
};

export function isOptionalHolidayCode(code: string | null | undefined) {
  return String(code ?? "").toUpperCase() === OPTIONAL_HOLIDAY_CODE;
}

export function optionalHolidayDayLabel(isoDate: string) {
  return format(parseISO(isoDate.slice(0, 10)), "EEEE");
}

export function optionalHolidayDisplayDate(isoDate: string) {
  return format(parseISO(isoDate.slice(0, 10)), "dd MMMM yyyy");
}

export function remainingOptionalHolidayEntitlement(input: {
  yearlyLimit: number;
  usedOrPending: number;
  upcomingAvailableDates: number;
}) {
  const leftover = Math.max(0, input.yearlyLimit - Math.max(0, input.usedOrPending));
  return Math.max(0, Math.min(leftover, Math.max(0, input.upcomingAvailableDates)));
}

export function upcomingOptionalHolidays(
  holidays: OptionalHolidayRecord[],
  today = getTodayDateString(),
) {
  return holidays
    .filter((holiday) => holiday.date.slice(0, 10) >= today)
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function optionalHolidaysForList(
  holidays: OptionalHolidayRecord[],
  taken: Map<string, "pending" | "approved">,
  today = getTodayDateString(),
): OptionalHolidayListItem[] {
  return [...holidays]
    .map((holiday) => {
      const date = holiday.date.slice(0, 10);
      const takenStatus = taken.get(date);
      const isPast = date < today;
      return {
        ...holiday,
        date,
        day: optionalHolidayDayLabel(date),
        status: takenStatus ?? (isPast ? "passed" : "available"),
      } as OptionalHolidayListItem;
    })
    .sort((left, right) => left.date.localeCompare(right.date));
}
