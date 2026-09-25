import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeLateMinutes,
  computeWorkHours,
  DEFAULT_ATTENDANCE_RULES,
  LATE_ENTRY_NOTE_TAG,
  mergeAttendancePolicyNotes,
  resolveEarlyLogoutKind,
  resolveEffectivePunchAttendanceStatus,
  resolvePunchAttendanceResult,
  toDisplayAttendanceNotes,
} from "@/lib/attendance/services/attendance-utils";
import { applyPayrollAttendanceDay } from "@/lib/payroll/services/payroll-attendance-leave-sync";
import {
  lateEntryPenaltyDays,
  type AttendanceSummary as PayrollAttendanceSummary,
} from "@/lib/payroll/services/payroll-calculator";

describe("toDisplayAttendanceNotes", () => {
  it("hides excel sheet sync identifiers from employee-facing remarks", () => {
    assert.equal(toDisplayAttendanceNotes("excel-sept-2026-sheet-sync"), null);
    assert.equal(toDisplayAttendanceNotes("excel-2026-09-sheet-sync"), null);
    assert.equal(toDisplayAttendanceNotes("Excel Sept 2026 Sheet Sync"), null);
    assert.equal(toDisplayAttendanceNotes("cleared-blank-excel-day"), null);
    assert.equal(
      toDisplayAttendanceNotes("excel-sept-2026-sheet-sync|cleared-blank-excel-day"),
      null,
    );
  });

  it("hides provenance / import metadata tags", () => {
    assert.equal(toDisplayAttendanceNotes("src:P|import:batch-1"), null);
    assert.equal(toDisplayAttendanceNotes("excel-import-2026-09"), null);
    assert.equal(toDisplayAttendanceNotes("migration-2026-09-attendance"), null);
  });

  it("keeps genuine human remarks", () => {
    assert.equal(toDisplayAttendanceNotes("Client visit ran late"), "Client visit ran late");
    assert.equal(
      toDisplayAttendanceNotes("excel-sept-2026-sheet-sync|Approved late arrival"),
      "Approved late arrival",
    );
    assert.equal(
      toDisplayAttendanceNotes("src:P|Traffic delay"),
      "Traffic delay",
    );
  });

  it("returns null for empty notes so UI can show —", () => {
    assert.equal(toDisplayAttendanceNotes(null), null);
    assert.equal(toDisplayAttendanceNotes("   "), null);
  });
});

describe("company attendance policy — late / early checkout / hours", () => {
  const date = "2026-09-25";
  const rules = DEFAULT_ATTENDANCE_RULES;

  it("10:05 = Present, 10:06/10:08/10:12 = Late (check-in only, in-progress)", () => {
    assert.equal(computeLateMinutes(`${date}T10:05:00+05:30`, date, rules.lateAfter), 0);
    assert.equal(
      resolvePunchAttendanceResult(`${date}T10:05:00+05:30`, null, date, rules).status,
      "present",
    );
    assert.equal(
      resolvePunchAttendanceResult(`${date}T10:06:00+05:30`, null, date, rules).status,
      "late",
    );
    assert.equal(
      resolvePunchAttendanceResult(`${date}T10:08:00+05:30`, null, date, rules).status,
      "late",
    );
    assert.equal(
      resolvePunchAttendanceResult(`${date}T10:12:00+05:30`, null, date, rules).status,
      "late",
    );
  });

  it("09:59 / 10:00 remain Present", () => {
    assert.equal(
      resolvePunchAttendanceResult(`${date}T09:59:00+05:30`, null, date, rules).status,
      "present",
    );
    assert.equal(
      resolvePunchAttendanceResult(`${date}T10:00:00+05:30`, null, date, rules).status,
      "present",
    );
  });

  it("10:12 → 10:29 = Absent", () => {
    const checkIn = `${date}T10:12:00+05:30`;
    const checkOut = `${date}T10:29:00+05:30`;
    const outcome = resolvePunchAttendanceResult(checkIn, checkOut, date, rules, {
      finalizeHours: true,
    });
    assert.equal(outcome.status, "absent");
    assert.equal(outcome.earlyLogout, "full_lop");
    assert.equal(outcome.isLateEntry, true);
    assert.ok(!outcome.policyNoteTags.includes(LATE_ENTRY_NOTE_TAG));
    assert.ok(outcome.policyNoteTags.includes("early-logout:full"));
    assert.equal(computeWorkHours(checkIn, checkOut), 0.28);
    const notes = mergeAttendancePolicyNotes(null, outcome.policyNoteTags);
    assert.equal(notes, "early-logout:full");
    assert.ok(!notes?.includes("src:LOP"));
  });

  it("10:12 → 18:59 = Absent", () => {
    const checkIn = `${date}T10:12:00+05:30`;
    const checkOut = `${date}T18:59:00+05:30`;
    const outcome = resolvePunchAttendanceResult(checkIn, checkOut, date, rules, {
      finalizeHours: true,
    });
    assert.equal(outcome.status, "absent");
    assert.equal(outcome.earlyLogout, "full_lop");
    assert.equal(outcome.isLateEntry, true);
    assert.ok(!outcome.policyNoteTags.includes(LATE_ENTRY_NOTE_TAG));
  });

  it("10:12 → 19:00 = Late", () => {
    const checkIn = `${date}T10:12:00+05:30`;
    const checkOut = `${date}T19:00:00+05:30`;
    const outcome = resolvePunchAttendanceResult(checkIn, checkOut, date, rules, {
      finalizeHours: true,
    });
    assert.equal(outcome.status, "late");
    assert.equal(outcome.earlyLogout, "none");
    assert.equal(outcome.isLateEntry, true);
    assert.equal(outcome.policyNoteTags.length, 0);
  });

  it("10:08 → 19:15 = Late", () => {
    const checkIn = `${date}T10:08:00+05:30`;
    const checkOut = `${date}T19:15:00+05:30`;
    const outcome = resolvePunchAttendanceResult(checkIn, checkOut, date, rules, {
      finalizeHours: true,
    });
    assert.equal(outcome.status, "late");
    assert.equal(outcome.earlyLogout, "none");
    assert.equal(outcome.isLateEntry, true);
  });

  it("10:00 → 19:00 = Present", () => {
    const checkIn = `${date}T10:00:00+05:30`;
    const checkOut = `${date}T19:00:00+05:30`;
    const outcome = resolvePunchAttendanceResult(checkIn, checkOut, date, rules, {
      finalizeHours: true,
    });
    assert.equal(outcome.status, "present");
    assert.equal(outcome.earlyLogout, "none");
    assert.equal(outcome.isLateEntry, false);
  });

  it("early checkout updated to 19:00 recalculates from Absent to Late/Present", () => {
    const checkIn = `${date}T10:12:00+05:30`;
    const early = resolvePunchAttendanceResult(
      checkIn,
      `${date}T10:29:00+05:30`,
      date,
      rules,
      { finalizeHours: true },
    );
    assert.equal(early.status, "absent");

    const correctedLate = resolvePunchAttendanceResult(
      checkIn,
      `${date}T19:00:00+05:30`,
      date,
      rules,
      { finalizeHours: true },
    );
    assert.equal(correctedLate.status, "late");
    assert.equal(correctedLate.earlyLogout, "none");

    const onTimeIn = `${date}T10:00:00+05:30`;
    const earlyOnTime = resolvePunchAttendanceResult(
      onTimeIn,
      `${date}T18:30:00+05:30`,
      date,
      rules,
      { finalizeHours: true },
    );
    assert.equal(earlyOnTime.status, "absent");

    const correctedPresent = resolvePunchAttendanceResult(
      onTimeIn,
      `${date}T19:00:00+05:30`,
      date,
      rules,
      { finalizeHours: true },
    );
    assert.equal(correctedPresent.status, "present");
    assert.equal(
      mergeAttendancePolicyNotes("late-entry|early-logout:full|src:LOP", correctedPresent.policyNoteTags),
      null,
    );
  });

  it("stale stored Late with early checkout reconciles to Absent without DB rewrite", () => {
    const checkIn = `${date}T10:12:00+05:30`;
    const checkOut = `${date}T10:29:00+05:30`;
    assert.equal(
      resolveEffectivePunchAttendanceStatus({
        storedStatus: "late",
        checkInAt: checkIn,
        checkOutAt: checkOut,
        attendanceDate: date,
        notes: null,
        rules,
      }),
      "absent",
    );
  });

  it("HR manual status is preserved even when punches look early", () => {
    assert.equal(
      resolveEffectivePunchAttendanceStatus({
        storedStatus: "present",
        checkInAt: `${date}T10:12:00+05:30`,
        checkOutAt: `${date}T10:29:00+05:30`,
        attendanceDate: date,
        notes: "src:P|manual-hr-status",
        rules,
      }),
      "present",
    );
  });

  it("Late check-in + checkout at 19:00 stays Late with actual working hours", () => {
    const checkIn = `${date}T10:08:00+05:30`;
    const checkOut = `${date}T19:00:00+05:30`;
    const outcome = resolvePunchAttendanceResult(checkIn, checkOut, date, rules, {
      finalizeHours: true,
    });
    assert.equal(outcome.status, "late");
    assert.equal(outcome.earlyLogout, "none");
    assert.equal(outcome.isLateEntry, true);
    assert.equal(computeWorkHours(checkIn, checkOut), 8.87);
  });

  it("checkout before lunch is Absent; does not count as Late entry", () => {
    const checkIn = `${date}T10:08:00+05:30`;
    const checkOut = `${date}T13:00:00+05:30`;
    const outcome = resolvePunchAttendanceResult(checkIn, checkOut, date, rules, {
      finalizeHours: true,
    });
    assert.equal(outcome.status, "absent");
    assert.equal(outcome.earlyLogout, "full_lop");
    assert.ok(!outcome.policyNoteTags.includes(LATE_ENTRY_NOTE_TAG));
    assert.ok(outcome.policyNoteTags.includes("early-logout:full"));
    const notes = mergeAttendancePolicyNotes(null, outcome.policyNoteTags);
    assert.ok(!notes?.includes("src:LOP"));
  });

  it("checkout remains possible after Late check-in (status resolves with both punches)", () => {
    const outcome = resolvePunchAttendanceResult(
      `${date}T10:12:00+05:30`,
      `${date}T19:00:00+05:30`,
      date,
      rules,
      { finalizeHours: true },
    );
    assert.equal(outcome.status, "late");
    assert.equal(resolveEarlyLogoutKind(`${date}T19:00:00+05:30`), "none");
  });

  it("working hours use actual timestamps (10:08 → 15:30)", () => {
    const hours = computeWorkHours(`${date}T10:08:00+05:30`, `${date}T15:30:00+05:30`);
    assert.equal(hours, 5.37);
  });

  it("3 qualifying Late entries → half-day LOP via existing payroll penalty", () => {
    assert.equal(lateEntryPenaltyDays(0), 0);
    assert.equal(lateEntryPenaltyDays(2), 0);
    assert.equal(lateEntryPenaltyDays(3), 0.5);
    assert.equal(lateEntryPenaltyDays(6), 1);

    const summary: PayrollAttendanceSummary = {
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      onLeaveDays: 0,
      weekOffDays: 0,
      holidayDays: 0,
      overtimeHours: 0,
      lateDays: 0,
    };

    applyPayrollAttendanceDay(summary, "late", 0);
    applyPayrollAttendanceDay(summary, "late", 0);
    applyPayrollAttendanceDay(summary, "late", 0);
    assert.equal(summary.lateDays, 3);
    assert.equal(lateEntryPenaltyDays(summary.lateDays), 0.5);

    // Early-checkout Absent must NOT count as a Late entry.
    const mixed: PayrollAttendanceSummary = {
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      onLeaveDays: 0,
      weekOffDays: 0,
      holidayDays: 0,
      overtimeHours: 0,
      lateDays: 0,
    };
    applyPayrollAttendanceDay(mixed, "absent", 0, "early-logout:full");
    applyPayrollAttendanceDay(mixed, "absent", 0, "late-entry|early-logout:full");
    assert.equal(mixed.lateDays, 0);
    assert.equal(mixed.absentDays, 2);
  });
});
