import { differenceInMinutes, parseISO } from "date-fns";

import { workHoursFromCheckInOut } from "@/lib/employee/attendance-format";

export const OFFICE_TIMEZONE = "Asia/Kolkata";
export const OFFICE_CHECK_IN_TIME = "10:00";
/** Official start time — check-in after 10:05 (5-minute grace) is marked late. */
export const OFFICE_LATE_AFTER_TIME = "10:05";
/** Check-in closes automatically at this office time (legacy; self-service punch no longer locks). */
export const OFFICE_CHECK_IN_LOCK_TIME = "10:07";
export const OFFICE_CHECK_OUT_TIME = "19:00";
/**
 * Legacy first-half marker (14:00). Punch status no longer splits early logout
 * at lunch — any checkout before office end is incomplete/absent.
 */
export const OFFICE_FIRST_HALF_END_TIME = "14:00";

export const LATE_ENTRY_NOTE_TAG = "late-entry";
export const EARLY_LOGOUT_FULL_NOTE_TAG = "early-logout:full";
/** @deprecated Half-day early logout is no longer applied; kept for note cleanup. */
export const EARLY_LOGOUT_HALF_NOTE_TAG = "early-logout:half";

export function getTodayDateString(timeZone = OFFICE_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/**
 * Returns true if current time in IST is at or after office checkout time (19:00 / 7:00 PM).
 * Before 7:00 PM on the present day, employees with no punch record are considered pending/unrecorded ("—"),
 * not marked absent until the workday closes at 7:00 PM.
 */
export function isAfterOfficeCheckoutTime(now = new Date(), timeZone = OFFICE_TIMEZONE): boolean {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  return hour >= 19;
}

export type AttendanceRules = {
  lateAfter: string;
  fullDayMinimumHours: number;
  halfDayMinimumHours: number;
};

export const DEFAULT_ATTENDANCE_RULES: AttendanceRules = {
  lateAfter: OFFICE_LATE_AFTER_TIME,
  fullDayMinimumHours: 8,
  halfDayMinimumHours: 4,
};

export function parseAttendanceRules(
  settings: Record<string, unknown> | null | undefined,
): AttendanceRules {
  const rules = settings?.attendance_rules;

  if (!rules || typeof rules !== "object") {
    return DEFAULT_ATTENDANCE_RULES;
  }

  const attendanceRules = rules as Record<string, unknown>;

  return {
    lateAfter:
      typeof attendanceRules.late_after === "string"
        ? attendanceRules.late_after
        : DEFAULT_ATTENDANCE_RULES.lateAfter,
    fullDayMinimumHours:
      typeof attendanceRules.full_day_minimum_hours === "number"
        ? attendanceRules.full_day_minimum_hours
        : DEFAULT_ATTENDANCE_RULES.fullDayMinimumHours,
    halfDayMinimumHours:
      typeof attendanceRules.half_day_minimum_hours === "number"
        ? attendanceRules.half_day_minimum_hours
        : DEFAULT_ATTENDANCE_RULES.halfDayMinimumHours,
  };
}

export function combineDateAndTime(date: string, time?: string | null): string | null {
  if (!time?.trim()) return null;
  return `${date}T${time}:00+05:30`;
}

export function isTimestampInFuture(value: string): boolean {
  return parseISO(value).getTime() > Date.now();
}

export function formatAttendanceTime(value?: string | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: OFFICE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parseISO(value));
}

export function extractTimeFromTimestamp(value?: string | null): string {
  if (!value) return "";

  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: OFFICE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parseISO(value));

  return formatted;
}

export function computeWorkHours(
  checkInAt?: string | null,
  checkOutAt?: string | null,
): number {
  return workHoursFromCheckInOut(checkInAt, checkOutAt);
}

export function computeLateMinutes(
  checkInAt: string | null | undefined,
  attendanceDate: string,
  lateAfter: string,
): number {
  if (!checkInAt) return 0;

  const [hours, minutes] = lateAfter.split(":").map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;

  const threshold = parseISO(
    `${attendanceDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`,
  );
  const checkIn = parseISO(checkInAt);
  const diff = differenceInMinutes(checkIn, threshold);

  return diff > 0 ? diff : 0;
}

function parseHmToMinutes(value: string): number | null {
  const [hours, minutes] = value.split(":").map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/** Wall-clock minutes from midnight in IST for a punch timestamp. */
export function istMinutesFromMidnight(timestamp: string): number | null {
  try {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone: OFFICE_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(parseISO(timestamp));
    return parseHmToMinutes(formatted);
  } catch {
    return null;
  }
}

export type EarlyLogoutKind = "none" | "full_lop" | "half_day";

/**
 * Early logout vs office end (19:00 / 7:00 PM).
 * - Checkout at/after office end → none (day may be Present or Late from check-in)
 * - Any checkout before office end → incomplete / Absent (not Present or Late)
 *
 * `firstHalfEnd` is ignored for status; kept on the options bag for call-site compat.
 */
export function resolveEarlyLogoutKind(
  checkOutAt: string | null | undefined,
  options?: { officeEnd?: string; firstHalfEnd?: string },
): EarlyLogoutKind {
  void options?.firstHalfEnd;
  if (!checkOutAt) return "none";
  const outMinutes = istMinutesFromMidnight(checkOutAt);
  const officeEndMinutes = parseHmToMinutes(options?.officeEnd ?? OFFICE_CHECK_OUT_TIME);
  if (outMinutes == null || officeEndMinutes == null) {
    return "none";
  }
  if (outMinutes >= officeEndMinutes) return "none";
  return "full_lop";
}

export type PunchAttendanceResult = {
  status: "present" | "late" | "absent" | "half_day";
  /** Check-in after grace — counts toward 3-late even when status is half_day/absent. */
  isLateEntry: boolean;
  earlyLogout: EarlyLogoutKind;
  /** Note tags to merge into attendance.notes for payroll / display. */
  policyNoteTags: string[];
};

export function isLateEntryAttendanceNotes(notes: string | null | undefined): boolean {
  return /\blate-entry\b/i.test(String(notes ?? ""));
}

export function isEarlyLogoutFullAttendanceNotes(
  notes: string | null | undefined,
): boolean {
  return /\bearly-logout:full\b/i.test(String(notes ?? ""));
}

export function isManualHrAttendanceNotes(notes: string | null | undefined): boolean {
  return /\bmanual-hr-status\b/i.test(String(notes ?? ""));
}

export function mergeAttendancePolicyNotes(
  existingNotes: string | null | undefined,
  policyNoteTags: string[],
): string | null {
  const tags = policyNoteTags.map((tag) => tag.trim()).filter(Boolean);
  const isEarlyLogoutFull = tags.some((tag) => /^early-logout:full$/i.test(tag));
  const existingText = String(existingNotes ?? "");
  const existingHadEarlyLogout = /\bearly-logout:full\b/i.test(existingText);
  const isManualHr = /\bmanual-hr-status\b/i.test(existingText);

  const kept = existingText
    .split("|")
    .map((part) => part.trim())
    .filter((part) => {
      if (part.length === 0) return false;
      if (/^late-entry$/i.test(part)) return false;
      if (/^early-logout:(full|half)$/i.test(part)) return false;
      // Drop early-checkout LOP markers when writing/clearing early-logout policy tags.
      if (
        /^src:LOP$/i.test(part) &&
        (isEarlyLogoutFull || existingHadEarlyLogout) &&
        !isManualHr
      ) {
        return false;
      }
      return true;
    });

  const next = [...kept];
  for (const tag of tags) {
    if (!next.some((part) => part.toLowerCase() === tag.toLowerCase())) {
      next.push(tag);
    }
  }

  return next.length > 0 ? next.join("|") : null;
}

/**
 * Single source of truth for punch-derived attendance status + policy tags.
 * Priority when checkout exists:
 * 1) checkout < 19:00 → Absent (incomplete) — never Present/Late
 * 2) checkout >= 19:00 + check-in ≤ 10:05 → Present
 * 3) checkout >= 19:00 + check-in > 10:05 → Late
 * Without checkout: in-progress present/late from check-in only (day not finalized).
 * Early-checkout Absent does not count toward the 3-lates/month penalty.
 */
export function resolvePunchAttendanceResult(
  checkInAt: string | null,
  checkOutAt: string | null,
  attendanceDate: string,
  rules: AttendanceRules,
  options?: {
    finalizeHours?: boolean;
    today?: string;
    officeEnd?: string;
    firstHalfEnd?: string;
  },
): PunchAttendanceResult {
  const lateMinutes = computeLateMinutes(checkInAt, attendanceDate, rules.lateAfter);
  const isLateEntry = lateMinutes > 0;
  const today = options?.today ?? getTodayDateString();
  const finalizeHours =
    options?.finalizeHours ?? (Boolean(checkOutAt) || attendanceDate < today);
  const earlyLogout = finalizeHours
    ? resolveEarlyLogoutKind(checkOutAt, {
        officeEnd: options?.officeEnd,
        firstHalfEnd: options?.firstHalfEnd,
      })
    : "none";

  let status: PunchAttendanceResult["status"] = "present";

  // Checkout present: early logout always wins over check-in Late/Present.
  if (finalizeHours && checkOutAt) {
    if (earlyLogout !== "none") {
      status = "absent";
    } else if (isLateEntry) {
      status = "late";
    } else {
      status = "present";
    }
  } else if (isLateEntry) {
    // In-progress only — not a finalized day until checkout (or past day close).
    status = "late";
  } else {
    status = "present";
  }

  const policyNoteTags: string[] = [];
  // Early-checkout Absent never tags late-entry — those days must not feed 3-late penalty.
  if (earlyLogout === "full_lop") {
    policyNoteTags.push(EARLY_LOGOUT_FULL_NOTE_TAG);
  }

  return { status, isLateEntry, earlyLogout, policyNoteTags };
}

/**
 * Display / list reconciliation: punch rows follow resolvePunchAttendanceResult so a
 * stale stored Late never survives an early checkout. HR manual sheet rows and
 * leave/holiday classifications keep their stored status (no bulk DB rewrite).
 */
export function resolveEffectivePunchAttendanceStatus(input: {
  storedStatus: string | null | undefined;
  checkInAt: string | null | undefined;
  checkOutAt: string | null | undefined;
  attendanceDate: string;
  notes?: string | null;
  rules: AttendanceRules;
  today?: string;
}): PunchAttendanceResult["status"] | string {
  const stored = String(input.storedStatus ?? "");
  if (isManualHrAttendanceNotes(input.notes)) {
    return stored || "absent";
  }
  if (stored === "on_leave" || stored === "holiday" || stored === "week_off") {
    return stored;
  }
  if (input.checkInAt) {
    return resolvePunchAttendanceResult(
      input.checkInAt,
      input.checkOutAt ?? null,
      input.attendanceDate,
      input.rules,
      { today: input.today },
    ).status;
  }
  return stored || "absent";
}

/**
 * Status-only wrapper used by punch / correction writers.
 */
export function resolveAttendanceStatusFromPunches(
  checkInAt: string | null,
  checkOutAt: string | null,
  attendanceDate: string,
  rules: AttendanceRules,
  options?: {
    finalizeHours?: boolean;
    today?: string;
    officeEnd?: string;
    firstHalfEnd?: string;
  },
): "present" | "late" | "absent" | "half_day" {
  return resolvePunchAttendanceResult(
    checkInAt,
    checkOutAt,
    attendanceDate,
    rules,
    options,
  ).status;
}

export type AttendanceStatusValue =
  | "present"
  | "absent"
  | "half_day"
  | "late"
  | "on_leave"
  | "holiday"
  | "week_off";

export function validateAttendanceStatusConsistency(input: {
  attendanceStatus: AttendanceStatusValue;
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workHours: number;
  rules: AttendanceRules;
}): string | null {
  const { attendanceStatus, checkInAt, checkOutAt, workHours, rules } = input;
  const hasPunch = Boolean(checkInAt && checkOutAt);
  const lateMinutes = checkInAt
    ? computeLateMinutes(checkInAt, input.attendanceDate, rules.lateAfter)
    : 0;

  if (attendanceStatus === "absent") {
    // Early checkout (before office end) is stored as Absent/incomplete while
    // punches and working hours remain on the record for later correction.
    if (checkOutAt) {
      const earlyLogout = resolveEarlyLogoutKind(checkOutAt);
      if (earlyLogout !== "none") {
        return null;
      }
    }
    if (hasPunch || workHours >= rules.halfDayMinimumHours) {
      return "Absent status cannot be used when check-in, check-out, or working hours are recorded.";
    }
    return null;
  }

  if (
    attendanceStatus === "on_leave" ||
    attendanceStatus === "holiday" ||
    attendanceStatus === "week_off"
  ) {
    return null;
  }

  if (attendanceStatus === "late") {
    if (!checkInAt) {
      return "Late status requires a check-in time.";
    }
    if (lateMinutes === 0) {
      return "Late status does not match the entered check-in time.";
    }
    // Checkout is optional: late is determined from check-in alone.
    // When both punches exist, still reject impossible short sessions.
    if (hasPunch && workHours < rules.halfDayMinimumHours && workHours >= 0.25) {
      // Short but non-negligible days may be half_day / early-logout instead.
      return null;
    }
    return null;
  }

  if (attendanceStatus === "present") {
    if (!hasPunch) {
      return "Present status requires check-in and check-out times.";
    }
    if (workHours < rules.fullDayMinimumHours) {
      return `Present status requires at least ${rules.fullDayMinimumHours} working hours based on organization rules.`;
    }
    if (lateMinutes > 0) {
      return "Use Late status when check-in is after the allowed time.";
    }
    return null;
  }

  if (attendanceStatus === "half_day") {
    if (!hasPunch) {
      return "Half day status requires check-in and check-out times.";
    }
    if (workHours >= rules.fullDayMinimumHours) {
      return "Half day status cannot be used when working hours meet full-day requirements.";
    }
    if (workHours > 0 && workHours < rules.halfDayMinimumHours) {
      return `Half day status requires at least ${rules.halfDayMinimumHours} working hours based on organization rules.`;
    }
    return null;
  }

  return null;
}

/**
 * Internal attendance note segments (imports, provenance tags) — never show in UI.
 */
function isInternalAttendanceNoteSegment(part: string): boolean {
  const normalized = part.trim();
  if (!normalized) return true;
  if (/^src:/i.test(normalized)) return true;
  if (/^import:/i.test(normalized)) return true;
  if (/^historical_import:/i.test(normalized)) return true;
  if (/^excel[\s_-]*import/i.test(normalized)) return true;
  if (/^import[\s_-]*\d{4}/i.test(normalized)) return true;
  if (/^(excel[\s_-]*)?import[\w-]*$/i.test(normalized)) return true;
  if (/^geo:/i.test(normalized)) return true;
  if (/^sheet[\s_-]*(screenshot[\s_-]*)?sync/i.test(normalized)) return true;
  if (/screenshot[\s_-]*sync/i.test(normalized)) return true;
  // e.g. excel-sept-2026-sheet-sync, excel-2026-09-sheet-sync
  if (/sheet[\s_-]*sync/i.test(normalized)) return true;
  if (/^excel[\s_-][\w.-]*sync$/i.test(normalized)) return true;
  if (/^excel[\s_-]\d{4}([\s_-]\d{2})?[\w.-]*$/i.test(normalized)) return true;
  if (/kept[\s_-]*real[\s_-]*punch/i.test(normalized)) return true;
  if (/^migration[\s_-]/i.test(normalized)) return true;
  if (/^(job|batch|source)[\s_-]?id[:\s_-]/i.test(normalized)) return true;
  if (/^(sync|import|migration)[\s_-](job|batch|id|run)[\w_-]*$/i.test(normalized)) {
    return true;
  }
  // Excel sync cleanup / blank-day markers (e.g. cleared-blank-excel-day)
  if (/cleared[\s_-].*excel/i.test(normalized)) return true;
  if (/blank[\s_-]*excel[\s_-]*day/i.test(normalized)) return true;
  if (/^cleared[\s_-][\w.-]+$/i.test(normalized)) return true;
  // Policy tags written by punch resolution — not employee-facing remarks.
  if (/^late-entry$/i.test(normalized)) return true;
  if (/^early-logout:(full|half)$/i.test(normalized)) return true;
  return false;
}

/**
 * Strip internal import/provenance tags from attendance notes for UI display.
 * Historical imports store notes like `src:P|import:<batchId>` or `excel-import-2026-09`.
 * Meaningful trailing remarks (e.g. late reason) after `|` are preserved.
 */
export function toDisplayAttendanceNotes(notes?: string | null): string | null {
  if (!notes?.trim()) return null;

  const cleaned = notes
    .trim()
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part && !isInternalAttendanceNoteSegment(part))
    .join(" | ")
    .trim();

  return cleaned || null;
}
