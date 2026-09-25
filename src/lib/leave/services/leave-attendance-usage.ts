import { roundLeaveDays } from "@/lib/leave/services/leave-usage";

const ATTENDANCE_LEAVE_CODE_RE = /\bsrc:(CL|EL|PL|OH)\b/i;
const ATTENDANCE_LOP_RE = /\bsrc:LOP\b/i;

export type AttendanceLeaveDay = {
  date: string;
  code: "CL" | "EL" | "PL" | "OH";
};

/** Parses sheet/HRMS attendance notes like `src:CL|excel-import-…` into a leave type code. */
export function leaveTypeCodeFromAttendanceNotes(
  notes: string | null | undefined,
): "CL" | "EL" | "PL" | "OH" | null {
  const match = String(notes ?? "").match(ATTENDANCE_LEAVE_CODE_RE);
  if (!match) return null;
  return match[1].toUpperCase() as "CL" | "EL" | "PL" | "OH";
}

export function isLopAttendanceLeaveNotes(notes: string | null | undefined): boolean {
  return ATTENDANCE_LOP_RE.test(String(notes ?? ""));
}

/**
 * Counts attendance days marked as CL/EL/PL from notes.
 * Ignores P, H, LOP, A, sandwich, and leave-sync notes without an explicit type.
 */
export function countAttendanceLeaveDaysByCode(
  rows: Array<{ notes?: string | null }>,
): Record<"CL" | "EL" | "PL", number> {
  const counts: Record<"CL" | "EL" | "PL", number> = { CL: 0, EL: 0, PL: 0 };
  for (const row of rows) {
    const code = leaveTypeCodeFromAttendanceNotes(row.notes);
    if (!code || code === "OH") continue;
    counts[code] = roundLeaveDays(counts[code] + 1);
  }
  return counts;
}

/**
 * Lists distinct attendance dates marked as CL/EL/PL/OH (sheet / HR status source).
 * Does not invent sandwich Sundays — only explicit src markers count.
 */
export function listAttendanceLeaveDays(
  rows: Array<{ attendance_date?: string | null; notes?: string | null }>,
): AttendanceLeaveDay[] {
  const byDate = new Map<string, AttendanceLeaveDay>();
  for (const row of rows) {
    const date = String(row.attendance_date ?? "").slice(0, 10);
    if (!date) continue;
    const code = leaveTypeCodeFromAttendanceNotes(row.notes);
    if (!code) continue;
    byDate.set(date, { date, code });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Lists distinct attendance dates marked as LOP (`src:LOP`). */
export function listAttendanceLopDays(
  rows: Array<{ attendance_date?: string | null; notes?: string | null }>,
): string[] {
  const dates = new Set<string>();
  for (const row of rows) {
    const date = String(row.attendance_date ?? "").slice(0, 10);
    if (!date || !isLopAttendanceLeaveNotes(row.notes)) continue;
    dates.add(date);
  }
  return [...dates].sort((a, b) => a.localeCompare(b));
}

/**
 * Merges attendance-marked usage with leave-request paid usage without double-counting.
 * Attendance sheet / notes are preferred when both sources cover the same consumption.
 */
export function mergeAttendanceAndRequestLeaveUsage(input: {
  attendanceDays: number;
  requestPaidDays: number;
}): number {
  return roundLeaveDays(
    Math.max(0, Number(input.attendanceDays) || 0, Number(input.requestPaidDays) || 0),
  );
}
