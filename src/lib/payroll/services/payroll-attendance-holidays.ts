/**
 * Official company holidays (hrms.holidays, is_optional = false) must count as
 * Holiday (H) in payroll attendance facts. Weekly offs are never auto-converted
 * to holidays — only configured official holiday dates are credited.
 */

export type AttendanceStatusByDate = Map<string, string | null | undefined>;

export type ApplyOfficialHolidaysInput = {
  /** Non-optional company holiday dates (yyyy-MM-dd). */
  officialHolidayDates: readonly string[];
  /** Existing attendance status by date for one employee. */
  statusByDate: AttendanceStatusByDate;
  /** Inclusive lower bound (joining date / period start). */
  periodStart: string;
  /** Inclusive upper bound (as-of / period end). */
  periodEnd: string;
};

export type AttendanceHolidayCounters = {
  presentDays: number;
  absentDays: number;
  halfDays: number;
  onLeaveDays: number;
  weekOffDays: number;
  holidayDays: number;
};

/**
 * Mutates attendance counters so each official holiday in range counts as H once.
 *
 * - Missing row or week_off → holiday (+1 holiday; −1 week_off if reclassified)
 * - Already holiday → no change
 * - present / late / half_day / on_leave → leave as-is (already paid via that status)
 * - absent → reclassify to holiday (official holidays are never unpaid absence)
 *
 * Does not touch Saturdays/Sundays that are not in officialHolidayDates.
 */
export function applyOfficialHolidaysToAttendanceSummary(
  summary: AttendanceHolidayCounters,
  input: ApplyOfficialHolidaysInput,
): void {
  const start = input.periodStart.slice(0, 10);
  const end = input.periodEnd.slice(0, 10);
  if (!start || !end || start > end) return;

  const seen = new Set<string>();
  for (const raw of input.officialHolidayDates) {
    const date = String(raw ?? "").slice(0, 10);
    if (!date || date < start || date > end || seen.has(date)) continue;
    seen.add(date);

    const status = input.statusByDate.get(date) ?? null;

    if (status === "holiday") continue;

    if (status === "present" || status === "late" || status === "half_day" || status === "on_leave") {
      continue;
    }

    if (status === "week_off") {
      summary.weekOffDays = Math.max(0, summary.weekOffDays - 1);
      summary.holidayDays += 1;
      continue;
    }

    if (status === "absent") {
      summary.absentDays = Math.max(0, summary.absentDays - 1);
      summary.holidayDays += 1;
      continue;
    }

    // No attendance row (or unknown status): credit the official holiday.
    summary.holidayDays += 1;
  }
}

/** Statuses that should not be overwritten when materializing official holidays. */
export function shouldPreserveAttendanceOverOfficialHoliday(
  status: string | null | undefined,
): boolean {
  return (
    status === "present" ||
    status === "late" ||
    status === "half_day" ||
    status === "on_leave" ||
    status === "holiday"
  );
}
