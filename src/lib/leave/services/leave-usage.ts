import {
  calculateLeaveDuration,
  type LeaveCalendarContext,
  type LeaveDurationBreakdown,
} from "@/lib/leave/services/leave-calendar-engine";

export function roundLeaveDays(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatLeaveDayCount(value: number) {
  const rounded = roundLeaveDays(value);
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

export function formatLeaveDayUnit(value: number) {
  return Math.abs(roundLeaveDays(value)) === 1 ? "day" : "days";
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

export function resolveLeaveDurationBreakdown(
  request: {
    startDate: string;
    endDate: string;
    isHalfDay: boolean;
    durationBreakdown?: unknown;
  },
  calendar: LeaveCalendarContext,
): LeaveDurationBreakdown {
  return (
    parseDurationBreakdown(request.durationBreakdown) ??
    calculateLeaveDuration({
      startDate: request.startDate.slice(0, 10),
      endDate: request.endDate.slice(0, 10),
      isHalfDay: request.isHalfDay,
      calendar,
    })
  );
}

/** Paid portion reserved on a request. Excess beyond balance is stored as lopDays. */
export function paidDaysFromLeaveRequest(request: {
  total_days?: number | string | null;
  duration_breakdown?: unknown;
}) {
  const breakdown = request.duration_breakdown as { paidDays?: unknown } | null;
  if (breakdown && typeof breakdown.paidDays === "number" && Number.isFinite(breakdown.paidDays)) {
    return roundLeaveDays(Math.max(0, breakdown.paidDays));
  }
  return roundLeaveDays(Math.max(0, Number(request.total_days ?? 0)));
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
