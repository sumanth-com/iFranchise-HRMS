/**
 * Attendance status UI labels for sheet-aligned display (P/A/CL/EL/LOP/H).
 * Maps onto existing hrms.attendance_status + `src:` note markers — no new DB enum.
 */
import { leaveTypeCodeFromAttendanceNotes } from "@/lib/leave/services/leave-attendance-usage";

export const ATTENDANCE_UI_DISPLAY_STATUSES = [
  "present",
  "absent",
  "casual_leave",
  "earned_leave",
  "lop",
  "holiday",
] as const;

export type AttendanceUiDisplayStatus = (typeof ATTENDANCE_UI_DISPLAY_STATUSES)[number];

export const ATTENDANCE_UI_DISPLAY_LABELS: Record<AttendanceUiDisplayStatus, string> = {
  present: "Present",
  absent: "Absent",
  casual_leave: "Casual Leave",
  earned_leave: "Earned Leave",
  lop: "LOP",
  holiday: "Holiday",
};

/** HR manual create/update Status selector — same labels as display. */
export const MANUAL_ATTENDANCE_UI_STATUSES = [
  "present",
  "absent",
  "casual_leave",
  "earned_leave",
  "lop",
  "holiday",
] as const;

export type ManualAttendanceUiStatus = (typeof MANUAL_ATTENDANCE_UI_STATUSES)[number];

export const MANUAL_ATTENDANCE_STATUS_ITEMS: ReadonlyArray<{
  value: ManualAttendanceUiStatus;
  label: string;
}> = ATTENDANCE_UI_DISPLAY_STATUSES.map((value) => ({
  value,
  label: ATTENDANCE_UI_DISPLAY_LABELS[value],
}));

/** Filter dropdown options (HR / Manager / CEO / Employee history). */
export const ATTENDANCE_STATUS_FILTER_ITEMS: ReadonlyArray<{
  value: ManualAttendanceUiStatus;
  label: string;
}> = MANUAL_ATTENDANCE_STATUS_ITEMS;

export type StoredManualAttendanceStatus =
  | "present"
  | "absent"
  | "on_leave"
  | "holiday";

export type ManualAttendanceSourceCode = "P" | "A" | "CL" | "EL" | "LOP" | "H";

export function isLopAttendanceNotes(notes: string | null | undefined): boolean {
  return /\bsrc:LOP\b/i.test(String(notes ?? ""));
}

export function isHolidayAttendanceNotes(notes: string | null | undefined): boolean {
  return /\bsrc:H\b/i.test(String(notes ?? ""));
}

/**
 * Resolve the sheet-aligned UI status/label from stored status + notes.
 * Never collapses CL/EL into "On Leave" or LOP into "Absent".
 */
export function resolveAttendanceUiDisplay(
  status: string | null | undefined,
  notes?: string | null,
): { key: AttendanceUiDisplayStatus; label: string } {
  const normalized = String(status ?? "");

  if (
    normalized === "holiday" ||
    normalized === "week_off" ||
    isHolidayAttendanceNotes(notes)
  ) {
    return { key: "holiday", label: ATTENDANCE_UI_DISPLAY_LABELS.holiday };
  }

  if (normalized === "on_leave") {
    if (leaveTypeCodeFromAttendanceNotes(notes) === "EL") {
      return { key: "earned_leave", label: ATTENDANCE_UI_DISPLAY_LABELS.earned_leave };
    }
    return { key: "casual_leave", label: ATTENDANCE_UI_DISPLAY_LABELS.casual_leave };
  }

  if (normalized === "absent") {
    if (isLopAttendanceNotes(notes)) {
      return { key: "lop", label: ATTENDANCE_UI_DISPLAY_LABELS.lop };
    }
    return { key: "absent", label: ATTENDANCE_UI_DISPLAY_LABELS.absent };
  }

  if (
    normalized === "present" ||
    normalized === "late" ||
    normalized === "half_day"
  ) {
    return { key: "present", label: ATTENDANCE_UI_DISPLAY_LABELS.present };
  }

  // Unknown / empty — fall back to Present label only when we have a present-like string
  if (!normalized) {
    return { key: "absent", label: ATTENDANCE_UI_DISPLAY_LABELS.absent };
  }

  return { key: "present", label: ATTENDANCE_UI_DISPLAY_LABELS.present };
}

export function mapManualUiStatusToStored(ui: ManualAttendanceUiStatus): {
  attendanceStatus: StoredManualAttendanceStatus;
  sourceCode: ManualAttendanceSourceCode;
} {
  switch (ui) {
    case "present":
      return { attendanceStatus: "present", sourceCode: "P" };
    case "absent":
      return { attendanceStatus: "absent", sourceCode: "A" };
    case "casual_leave":
      return { attendanceStatus: "on_leave", sourceCode: "CL" };
    case "earned_leave":
      return { attendanceStatus: "on_leave", sourceCode: "EL" };
    case "lop":
      return { attendanceStatus: "absent", sourceCode: "LOP" };
    case "holiday":
      return { attendanceStatus: "holiday", sourceCode: "H" };
  }
}

/** Map a stored attendance row back to the HR Status selector value. */
export function mapStoredAttendanceToManualUi(
  status: string | null | undefined,
  notes?: string | null,
): ManualAttendanceUiStatus | "" {
  const normalized = String(status ?? "");
  if (
    !normalized ||
    normalized === "upcoming" ||
    normalized === "on_request" ||
    normalized === "-"
  ) {
    return "";
  }
  return resolveAttendanceUiDisplay(status, notes).key;
}

/** Whether a row matches a UI status filter (sheet-aligned). */
export function matchesAttendanceUiStatusFilter(
  status: string | null | undefined,
  notes: string | null | undefined,
  filter?: string | null,
): boolean {
  if (!filter) return true;
  const key = resolveAttendanceUiDisplay(status, notes).key;
  // Legacy DB filter values still used in some URLs
  if (filter === "on_leave") {
    return key === "casual_leave" || key === "earned_leave";
  }
  // Late/half_day are not sheet display statuses (they render as Present).
  // Keep the filter precise to the stored status so Late never expands to all Present rows.
  if (filter === "late") {
    return String(status ?? "") === "late";
  }
  if (filter === "half_day") {
    return String(status ?? "") === "half_day";
  }
  if (filter === "week_off") {
    return key === "holiday";
  }
  return key === filter;
}

/** Write/replace the sheet-style `src:` provenance; keep any human remark segments. */
export function buildManualAttendanceNotes(
  sourceCode: ManualAttendanceSourceCode,
  existingNotes?: string | null,
): string {
  const kept = String(existingNotes ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(
      (part) =>
        part.length > 0 &&
        !/^src:/i.test(part) &&
        !/^manual-hr-status$/i.test(part),
    );
  return [`src:${sourceCode}`, "manual-hr-status", ...kept].join("|");
}
