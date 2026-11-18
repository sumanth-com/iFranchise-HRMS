import { expandDateRange } from "@/lib/leave/services/leave-utils";
import { calculateLeaveDuration, DEFAULT_LEAVE_CALENDAR, type LeaveCalendarContext } from "@/lib/leave/services/leave-calendar-engine";
import type { LeaveCalendarEntry, LeaveHolidayEntry } from "@/types/leave";

/** Shared display mapping for attendance and leave calendars; never changes recorded data. */
export function buildLeaveCalendarMarks(
  leaves: LeaveCalendarEntry[],
  holidays: LeaveHolidayEntry[],
  calendar: LeaveCalendarContext = DEFAULT_LEAVE_CALENDAR,
) {
  const holidayMap = new Map(holidays.map((holiday) => [holiday.holidayDate, holiday]));
  const calendarWithHolidays: LeaveCalendarContext = {
    ...calendar,
    holidays: Array.from(new Set([
      ...(calendar.holidays ?? []),
      ...holidays.filter((item) => !item.isOptional).map((item) => item.holidayDate),
    ])),
  };
  const sandwichDates = new Set<string>();
  leaves.forEach((leave) => {
    const days = calculateLeaveDuration({
      startDate: leave.startDate,
      endDate: leave.endDate,
      isHalfDay: leave.isHalfDay,
      calendar: calendarWithHolidays,
    }).days;
    (days ?? []).forEach((day) => {
      if (day.kind === "sandwich") sandwichDates.add(day.date);
    });
  });

  const leavesByDate = new Map<string, LeaveCalendarEntry[]>();
  leaves.forEach((leave) => {
    const pendingHrReview = Boolean(leave.hrReviewRequired) && leave.leaveStatus === "pending" && !leave.hrDecision;
    const dates = leave.dayAllocations && leave.dayAllocations.length > 0
      ? leave.dayAllocations.filter((item) => {
          if (item.kind !== "none") return true;
          // HR-review requests have not been allocated yet, but counted days remain visible.
          if (!pendingHrReview || !(item.counted > 0)) return false;
          return !sandwichDates.has(item.date);
        }).map((item) => item.date)
      : expandDateRange(leave.startDate, leave.endDate).filter((date) => !sandwichDates.has(date));
    dates.forEach((date) => {
      const existing = leavesByDate.get(date) ?? [];
      existing.push(leave);
      leavesByDate.set(date, existing);
    });
  });
  return { holidayMap, calendarWithHolidays, sandwichDates, leavesByDate };
}
