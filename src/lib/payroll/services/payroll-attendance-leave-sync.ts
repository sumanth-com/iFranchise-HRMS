/**
 * Sync attendance sheet markers (src:CL / src:EL / src:LOP) into payroll leave facts.
 * Attendance notes are preferred over leave-request breakdown when both exist.
 */
import { isLopAttendanceNotes } from "@/lib/attendance/manual-status";
import {
  isEarlyLogoutFullAttendanceNotes,
  isUnapprovedQualifyingLateEntry,
} from "@/lib/attendance/services/attendance-utils";
import {
  leaveTypeCodeFromAttendanceNotes,
  mergeAttendanceAndRequestLeaveUsage,
} from "@/lib/leave/services/leave-attendance-usage";
import type {
  AttendanceSummary,
  LeaveMonthSummary,
} from "@/lib/payroll/services/payroll-calculator";

export type PayrollAttendanceDayRow = {
  attendance_status?: string | null;
  notes?: string | null;
  overtime_hours?: number | string | null;
  /** yyyy-MM-dd when the row came from attendance already loaded for payroll. */
  attendance_date?: string | null;
};

export type AttendanceLeaveMarkerCounts = {
  clDays: number;
  elDays: number;
  plDays: number;
  lopDays: number;
  /** on_leave rows without an explicit src:CL/EL/PL marker (treated as CL). */
  unmarkedOnLeaveDays: number;
  /** Display-only dates for the same CL rows counted above. */
  clDates: string[];
  /** Display-only dates for the same EL rows counted above. */
  elDates: string[];
};

function attendanceLeaveDate(value: string | null | undefined): string | null {
  const iso = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

/** Count sheet leave markers from attendance status + notes. */
export function tallyAttendanceLeaveMarkers(
  rows: PayrollAttendanceDayRow[],
): AttendanceLeaveMarkerCounts {
  const counts: AttendanceLeaveMarkerCounts = {
    clDays: 0,
    elDays: 0,
    plDays: 0,
    lopDays: 0,
    unmarkedOnLeaveDays: 0,
    clDates: [],
    elDates: [],
  };

  for (const row of rows) {
    const status = String(row.attendance_status ?? "");
    const notes = row.notes;
    const code = leaveTypeCodeFromAttendanceNotes(notes);
    const date = attendanceLeaveDate(row.attendance_date);

    if (code === "CL") {
      counts.clDays += 1;
      if (date) counts.clDates.push(date);
      continue;
    }
    if (code === "EL") {
      counts.elDays += 1;
      if (date) counts.elDates.push(date);
      continue;
    }
    if (code === "PL") {
      counts.plDays += 1;
      continue;
    }
    if (isLopAttendanceNotes(notes)) {
      counts.lopDays += 1;
      continue;
    }
    if (status === "on_leave") {
      // Sheet/UI default: on_leave without type code displays as Casual Leave.
      counts.unmarkedOnLeaveDays += 1;
      if (date) counts.clDates.push(date);
    }
  }

  return counts;
}

/**
 * Apply one attendance day to payroll counters.
 * CL/EL stay on_leave; LOP (src:LOP) is excluded from absentDays so leave.lopDays owns it.
 */
export function applyPayrollAttendanceDay(
  summary: AttendanceSummary,
  status: string | null | undefined,
  overtimeHours: number,
  notes?: string | null,
): void {
  void overtimeHours;
  const normalized = String(status ?? "");
  const leaveCode = leaveTypeCodeFromAttendanceNotes(notes);
  const lopMarker = isLopAttendanceNotes(notes);

  if (leaveCode === "CL" || leaveCode === "EL" || leaveCode === "PL" || normalized === "on_leave") {
    summary.onLeaveDays += 1;
    return;
  }

  if (normalized === "absent") {
    // src:LOP sheet markers are unpaid leave (leave.lopDays). Early-checkout
    // Absent is incomplete attendance and always counts as absentDays.
    if (isEarlyLogoutFullAttendanceNotes(notes) || !lopMarker) {
      summary.absentDays += 1;
    }
    if (isUnapprovedQualifyingLateEntry(normalized, notes)) {
      summary.lateDays += 1;
    }
    return;
  }

  switch (normalized) {
    case "present":
      summary.presentDays += 1;
      break;
    case "late":
      summary.presentDays += 1;
      if (isUnapprovedQualifyingLateEntry(normalized, notes)) {
        summary.lateDays += 1;
      }
      break;
    case "half_day":
      summary.halfDays += 1;
      if (isUnapprovedQualifyingLateEntry(normalized, notes)) {
        summary.lateDays += 1;
      }
      break;
    case "week_off":
      summary.weekOffDays += 1;
      break;
    case "holiday":
      summary.holidayDays += 1;
      break;
    default:
      break;
  }
}

/**
 * Merge attendance sheet markers with approved leave-request summary.
 * When attendance marks CL/EL, those days must not become LOP from request breakdown.
 */
export function mergePayrollLeaveSummary(input: {
  attendanceRows: PayrollAttendanceDayRow[];
  requestSummary: LeaveMonthSummary;
}): LeaveMonthSummary {
  const markers = tallyAttendanceLeaveMarkers(input.attendanceRows);
  const attendanceCl = markers.clDays + markers.unmarkedOnLeaveDays;
  const attendanceEl = markers.elDays;
  const attendancePl = markers.plDays;
  const attendancePaid = attendanceCl + attendanceEl + attendancePl;
  const attendanceLop = markers.lopDays;

  const request = input.requestSummary;
  const requestCl = request.clDays ?? 0;
  const requestEl = request.elDays ?? 0;
  const requestPaid = request.paidLeaveDays;
  const requestLop = request.lopDays;

  const clDays = mergeAttendanceAndRequestLeaveUsage({
    attendanceDays: attendanceCl,
    requestPaidDays: requestCl,
  });
  const elDays = mergeAttendanceAndRequestLeaveUsage({
    attendanceDays: attendanceEl,
    requestPaidDays: requestEl,
  });
  const paidLeaveDays = mergeAttendanceAndRequestLeaveUsage({
    attendanceDays: attendancePaid,
    requestPaidDays: requestPaid,
  });

  // Prefer attendance LOP markers. If attendance already records paid CL/EL for the
  // month, do not invent LOP from a conflicting leave-request breakdown.
  const lopDays =
    attendancePaid > 0
      ? attendanceLop
      : mergeAttendanceAndRequestLeaveUsage({
          attendanceDays: attendanceLop,
          requestPaidDays: requestLop,
        });

  const hasAttendanceTypeSplit =
    markers.clDays > 0 ||
    markers.elDays > 0 ||
    markers.unmarkedOnLeaveDays > 0;

  return {
    lopDays,
    paidLeaveDays: Math.max(paidLeaveDays, clDays + elDays + attendancePl),
    clDays: hasAttendanceTypeSplit ? clDays : requestCl > 0 ? requestCl : clDays,
    elDays: hasAttendanceTypeSplit ? elDays : requestEl > 0 ? requestEl : elDays,
    clDates: hasAttendanceTypeSplit ? markers.clDates : (request.clDates ?? []),
    elDates: hasAttendanceTypeSplit ? markers.elDates : (request.elDates ?? []),
    sandwichDates: request.sandwichDates ?? [],
  };
}
