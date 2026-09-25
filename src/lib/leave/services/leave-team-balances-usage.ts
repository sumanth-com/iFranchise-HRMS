import { OPTIONAL_HOLIDAY_CODE } from "@/lib/leave/optional-holiday";
import type { AttendanceLeaveDay } from "@/lib/leave/services/leave-attendance-usage";
import { paidLeaveTypeDisplayName } from "@/lib/leave/services/leave-policy-engine";
import {
  paidLeaveDaysInRange,
  roundLeaveDays,
} from "@/lib/leave/services/leave-usage";
import type { TeamLeaveUsageEntry } from "@/types/leave";

type DayAllocation = {
  date?: string;
  kind?: string;
  counted?: number;
};

function statusLabel(status: string): string {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "approved") return "Approved";
  if (normalized === "pending") return "Pending";
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function usageSortKey(entry: TeamLeaveUsageEntry): string {
  return `${entry.startDate}\0${entry.endDate}\0${entry.leaveTypeCode}`;
}

/**
 * Expand approved leave into month-scoped usage lines.
 * Includes paid days and sandwich weekly-offs that still consume the leave type
 * (allocation kind stays "sandwich", not "lop").
 * Never throws on malformed breakdown payloads — returns [].
 */
export function buildMonthScopedLeaveUsageEntries(input: {
  startDate: string;
  endDate: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  status: string;
  reason: string | null;
  totalDays: number | string | null;
  durationBreakdown: unknown;
  monthRange: { start: string; end: string };
  holidayNameByDate?: Map<string, string>;
}): TeamLeaveUsageEntry[] {
  try {
    return buildMonthScopedLeaveUsageEntriesUnsafe(input);
  } catch (error) {
    console.error("[leave-balance] usage expansion failed", error);
    return [];
  }
}

function buildMonthScopedLeaveUsageEntriesUnsafe(input: {
  startDate: string;
  endDate: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  status: string;
  reason: string | null;
  totalDays: number | string | null;
  durationBreakdown: unknown;
  monthRange: { start: string; end: string };
  holidayNameByDate?: Map<string, string>;
}): TeamLeaveUsageEntry[] {
  const code = String(input.leaveTypeCode ?? "").toUpperCase();
  const startDate = String(input.startDate).slice(0, 10);
  const endDate = String(input.endDate).slice(0, 10);
  const status = statusLabel(input.status);
  const breakdown = input.durationBreakdown as {
    dayAllocations?: DayAllocation[];
  } | null;
  const allocations = Array.isArray(breakdown?.dayAllocations)
    ? breakdown.dayAllocations
    : [];

  if (code === OPTIONAL_HOLIDAY_CODE) {
    if (startDate < input.monthRange.start || startDate > input.monthRange.end) {
      return [];
    }
    return [
      {
        startDate,
        endDate: startDate,
        leaveTypeName: input.leaveTypeName,
        leaveTypeCode: code,
        days: 1,
        status,
        reason: input.reason,
        holidayName: input.holidayNameByDate?.get(startDate) ?? null,
      },
    ];
  }

  if (allocations.length > 0) {
    const entries: TeamLeaveUsageEntry[] = [];
    for (const day of allocations) {
      const date = String(day.date ?? "").slice(0, 10);
      if (!date || date < input.monthRange.start || date > input.monthRange.end) {
        continue;
      }
      const kind = String(day.kind ?? "").toLowerCase();
      // Paid entitlement + sandwich Sundays covered by the selected leave type.
      if (kind !== "paid" && kind !== "sandwich") continue;
      const days = roundLeaveDays(Math.max(0, Number(day.counted ?? 0)));
      if (days <= 0) continue;
      entries.push({
        startDate: date,
        endDate: date,
        leaveTypeName: input.leaveTypeName,
        leaveTypeCode: code,
        days,
        status,
        reason: input.reason,
        holidayName: null,
      });
    }
    return entries;
  }

  const monthDays = paidLeaveDaysInRange(
    {
      startDate,
      endDate,
      total_days: input.totalDays,
      duration_breakdown: input.durationBreakdown,
    },
    input.monthRange,
  );
  if (monthDays <= 0) return [];

  const clippedStart =
    startDate < input.monthRange.start ? input.monthRange.start : startDate;
  const clippedEnd = endDate > input.monthRange.end ? input.monthRange.end : endDate;

  return [
    {
      startDate: clippedStart,
      endDate: clippedEnd,
      leaveTypeName: input.leaveTypeName,
      leaveTypeCode: code,
      days: monthDays,
      status,
      reason: input.reason,
      holidayName: null,
    },
  ];
}

/** Convert attendance `src:CL` / `src:EL` / `src:OH` days into Leave Balance hover lines. */
export function usageEntriesFromAttendanceLeaveDays(
  days: AttendanceLeaveDay[],
  leaveTypeCode: "CL" | "EL" | "OH",
): TeamLeaveUsageEntry[] {
  const code = leaveTypeCode.toUpperCase() as "CL" | "EL" | "OH";
  const name =
    code === "OH" ? "Optional Holiday" : paidLeaveTypeDisplayName(code);
  return days
    .filter((day) => day.code === code)
    .map((day) => ({
      startDate: day.date,
      endDate: day.date,
      leaveTypeName: name,
      leaveTypeCode: code,
      days: 1,
      status: "Approved",
      reason: null,
      holidayName: null,
    }));
}

/** Convert attendance `src:LOP` dates into LOP hover lines. */
export function usageEntriesFromAttendanceLopDates(dates: string[]): TeamLeaveUsageEntry[] {
  return dates.map((date) => ({
    startDate: date,
    endDate: date,
    leaveTypeName: "LOP",
    leaveTypeCode: "LOP",
    days: 1,
    status: "Approved",
    reason: null,
    holidayName: null,
  }));
}

/**
 * Union request + attendance usage without double-counting the same calendar day.
 * Attendance sheet markers win when both sources cover the same date (ledger rule).
 * Multi-day request ranges are kept only when they do not overlap any single-day date.
 */
export function mergeMonthScopedLeaveUsageEntries(
  requestEntries: TeamLeaveUsageEntry[],
  attendanceEntries: TeamLeaveUsageEntry[],
): TeamLeaveUsageEntry[] {
  try {
    const byDate = new Map<string, TeamLeaveUsageEntry>();
    const ranges: TeamLeaveUsageEntry[] = [];

    for (const entry of requestEntries ?? []) {
      if (!entry) continue;
      if (entry.startDate === entry.endDate) {
        byDate.set(entry.startDate, entry);
      } else {
        ranges.push(entry);
      }
    }

    for (const entry of attendanceEntries ?? []) {
      if (!entry) continue;
      if (entry.startDate === entry.endDate) {
        byDate.set(entry.startDate, entry);
        continue;
      }
      ranges.push(entry);
    }

    const coveredDates = new Set(byDate.keys());
    const keptRanges = ranges.filter((entry) => {
      // Drop a range when any single-day row already covers part of it.
      for (const date of coveredDates) {
        if (date >= entry.startDate && date <= entry.endDate) return false;
      }
      return true;
    });

    return [...byDate.values(), ...keptRanges].sort((a, b) =>
      usageSortKey(a).localeCompare(usageSortKey(b)),
    );
  } catch (error) {
    console.error("[leave-balance] usage merge failed", error);
    return Array.isArray(attendanceEntries) && attendanceEntries.length > 0
      ? attendanceEntries
      : Array.isArray(requestEntries)
        ? requestEntries
        : [];
  }
}

export function sumUsageEntryDays(entries: TeamLeaveUsageEntry[]): number {
  return roundLeaveDays(
    entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.days) || 0), 0),
  );
}
