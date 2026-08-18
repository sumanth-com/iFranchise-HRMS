import {
  calculateLeaveDuration,
  type LeaveCalendarContext,
  type LeaveDurationBreakdown,
} from "@/lib/leave/services/leave-calendar-engine";

export function roundLeaveDays(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatLeaveDayCount(value: number) {
  return String(Math.round(roundLeaveDays(value)));
}

/** Monthly quota from a yearly pool. Small yearly pools (OH, PL) stay available in the month. */
export function monthlyLeaveQuota(code: string, yearlyTotal: number) {
  const yearly = Math.max(0, yearlyTotal);
  if (yearly === 0) return 0;
  if (code === "OH" || code === "PL" || yearly <= 2) {
    return roundLeaveDays(yearly);
  }
  return roundLeaveDays(yearly / 12);
}

function parseDurationBreakdown(value: unknown): LeaveDurationBreakdown | null {
  if (!value || typeof value !== "object") return null;
  const days = (value as { days?: unknown }).days;
  if (!Array.isArray(days)) return null;
  return value as LeaveDurationBreakdown;
}

export function countLeaveDaysInRange(
  request: {
    startDate: string;
    endDate: string;
    isHalfDay: boolean;
    durationBreakdown?: unknown;
  },
  range: { start: string; end: string },
  calendar: LeaveCalendarContext,
) {
  const breakdown =
    parseDurationBreakdown(request.durationBreakdown) ??
    calculateLeaveDuration({
      startDate: request.startDate,
      endDate: request.endDate,
      isHalfDay: request.isHalfDay,
      calendar,
    });

  return roundLeaveDays(
    breakdown.days.reduce((sum, day) => {
      if (day.date < range.start || day.date > range.end) return sum;
      return sum + Number(day.counted ?? 0);
    }, 0),
  );
}
