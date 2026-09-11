/**
 * Holiday credits for payroll attendance facts (Excel-aligned).
 *
 * - Official company holidays (hrms.holidays, is_optional = false) count as H
 *   within the applicable as-of window.
 * - Sundays count as H for payroll (Excel sheet marks Sundays as Holiday), also
 *   only within the as-of window — never invent future Sunday/holiday credits.
 * - Optional holidays are not auto-credited; they count only when the employee
 *   has an applicable attendance/leave mark.
 * - Saturdays stay normal working days unless marked/configured otherwise.
 * - week_off on a Sunday is reclassified to H (paid); bare week_off is unpaid.
 */

export type AttendanceStatusByDate = Map<string, string | null | undefined>;

export type ApplyHolidayCreditInput = {
  /** Existing attendance status by date for one employee. */
  statusByDate: AttendanceStatusByDate;
  /** Inclusive lower bound (joining date / period start). */
  periodStart: string;
  /** Inclusive upper bound (as-of / period end). */
  periodEnd: string;
};

export type ApplyOfficialHolidaysInput = ApplyHolidayCreditInput & {
  /** Non-optional company holiday dates (yyyy-MM-dd). */
  officialHolidayDates: readonly string[];
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
 * Credits one date as Holiday (H) at most once for this calculation pass.
 * Marks statusByDate as "holiday" after credit so official + Sunday overlap
 * (or a second pass) cannot double-count the same day.
 */
function creditHolidayDate(
  summary: AttendanceHolidayCounters,
  statusByDate: AttendanceStatusByDate,
  date: string,
): void {
  const status = statusByDate.get(date) ?? null;
  if (status === "holiday") return;

  if (status === "present" || status === "late" || status === "half_day" || status === "on_leave") {
    return;
  }

  if (status === "week_off") {
    summary.weekOffDays = Math.max(0, summary.weekOffDays - 1);
    summary.holidayDays += 1;
    statusByDate.set(date, "holiday");
    return;
  }

  if (status === "absent") {
    summary.absentDays = Math.max(0, summary.absentDays - 1);
    summary.holidayDays += 1;
    statusByDate.set(date, "holiday");
    return;
  }

  // No attendance row (or unknown status): credit holiday once.
  summary.holidayDays += 1;
  statusByDate.set(date, "holiday");
}

/**
 * Mutates attendance counters so each official holiday in range counts as H once.
 *
 * - Missing row or week_off → holiday (+1 holiday; −1 week_off if reclassified)
 * - Already holiday → no change
 * - present / late / half_day / on_leave → leave as-is (already paid via that status)
 * - absent → reclassify to holiday (official holidays are never unpaid absence)
 *
 * Does not auto-credit optional holidays or Sundays (see applySundayHolidays…).
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
    creditHolidayDate(summary, input.statusByDate, date);
  }
}

/** UTC weekday for an ISO date (0 = Sunday). */
export function isoDateUtcWeekday(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** All Sundays in [periodStart, periodEnd] inclusive (yyyy-MM-dd). */
export function listSundaysInRange(periodStart: string, periodEnd: string): string[] {
  const start = periodStart.slice(0, 10);
  const end = periodEnd.slice(0, 10);
  if (!start || !end || start > end) return [];

  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  const cursor = new Date(Date.UTC(ys, ms - 1, ds));
  const endMs = Date.UTC(ye, me - 1, de);

  const sundays: string[] = [];
  while (cursor.getTime() <= endMs) {
    if (cursor.getUTCDay() === 0) {
      const y = cursor.getUTCFullYear();
      const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
      const d = String(cursor.getUTCDate()).padStart(2, "0");
      sundays.push(`${y}-${m}-${d}`);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return sundays;
}

/**
 * Excel payroll: Sundays are Holiday (H), paid in Total Working Days.
 * Credits each Sunday in the as-of window once — does not write attendance rows
 * and does not credit Sundays after periodEnd (open-month as-of).
 */
export function applySundayHolidaysToAttendanceSummary(
  summary: AttendanceHolidayCounters,
  input: ApplyHolidayCreditInput,
): void {
  for (const date of listSundaysInRange(input.periodStart, input.periodEnd)) {
    creditHolidayDate(summary, input.statusByDate, date);
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
