import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildLateCheckInWarningEmail,
  isQualifyingLateAttendance,
  lateWarningCycle,
  lateWarningEventKey,
} from "@/lib/attendance/late-warning";
import { lateEntryPenaltyDays } from "@/lib/payroll/services/payroll-calculator";

describe("late warning cycle and half-day LOP", () => {
  it("maps the first two qualifying lates to 1/3 and 2/3 with no half-day LOP", () => {
    assert.deepEqual(lateWarningCycle(1), { label: "1/3", reachedHalfDayLop: false });
    assert.deepEqual(lateWarningCycle(2), { label: "2/3", reachedHalfDayLop: false });
    assert.equal(lateEntryPenaltyDays(1), 0);
    assert.equal(lateEntryPenaltyDays(2), 0);
  });

  it("maps the third qualifying late to 3/3 and one half-day LOP", () => {
    assert.deepEqual(lateWarningCycle(3), { label: "3/3", reachedHalfDayLop: true });
    assert.equal(lateEntryPenaltyDays(3), 0.5);
  });

  it("continues the next group without a second half-day until the sixth late", () => {
    assert.deepEqual(lateWarningCycle(4), { label: "1/3", reachedHalfDayLop: false });
    assert.equal(lateEntryPenaltyDays(4), 0.5);
    assert.deepEqual(lateWarningCycle(6), { label: "3/3", reachedHalfDayLop: true });
    assert.equal(lateEntryPenaltyDays(6), 1);
  });

  it("does not count on-time attendance or early-checkout absence", () => {
    assert.equal(isQualifyingLateAttendance("present", null), false);
    assert.equal(isQualifyingLateAttendance("absent", "early-logout:full"), false);
    assert.equal(isQualifyingLateAttendance("absent", "late-entry|early-logout:full"), false);
    assert.equal(isQualifyingLateAttendance("late", "late-entry"), true);
    assert.equal(lateWarningCycle(0), null);
  });

  it("uses one event key per employee and attendance date", () => {
    assert.equal(
      lateWarningEventKey("emp-1", "2026-10-02"),
      "late_warning:emp-1:2026-10-02",
    );
  });
});

describe("late warning email", () => {
  it("includes the 1/3 details and policy without a button or link", () => {
    const email = buildLateCheckInWarningEmail({
      employeeName: "Gangaram Sumanth Reddy",
      attendanceDateLabel: "2 Oct 2026",
      checkInTimeLabel: "10:12 am",
      cycle: { label: "1/3", reachedHalfDayLop: false },
    });

    assert.match(email.subject, /1\/3/);
    assert.match(email.html, /Gangaram Sumanth Reddy/);
    assert.match(email.html, /2 Oct 2026/);
    assert.match(email.html, /10:12 am/);
    assert.match(email.html, /1\/3/);
    assert.match(email.html, /half-day loss of pay/i);
    assert.match(email.html, /cid:ifranchise-logo/);
    assert.doesNotMatch(email.html, /<a\s/i);
    assert.doesNotMatch(email.html, /<button/i);
    assert.equal(email.html.includes("reached the half-day"), false);
  });

  it("states that 3/3 has reached the half-day LOP threshold", () => {
    const email = buildLateCheckInWarningEmail({
      employeeName: "Gangaram Sumanth Reddy",
      attendanceDateLabel: "6 Oct 2026",
      checkInTimeLabel: "10:20 am",
      cycle: { label: "3/3", reachedHalfDayLop: true },
    });

    assert.match(email.html, /3\/3/);
    assert.match(email.html, /reached the half-day loss of pay threshold/i);
    assert.doesNotMatch(email.html, /<a\s/i);
  });
});
