import { roundLeaveDays } from "@/lib/leave/services/leave-usage";

const ATTENDANCE_LEAVE_CODE_RE = /\bsrc:(CL|EL|PL)\b/i;

/** Parses sheet/HRMS attendance notes like `src:CL|excel-import-…` into a leave type code. */
export function leaveTypeCodeFromAttendanceNotes(
  notes: string | null | undefined,
): "CL" | "EL" | "PL" | null {
  const match = String(notes ?? "").match(ATTENDANCE_LEAVE_CODE_RE);
  if (!match) return null;
  return match[1].toUpperCase() as "CL" | "EL" | "PL";
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
    if (!code) continue;
    counts[code] = roundLeaveDays(counts[code] + 1);
  }
  return counts;
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
