import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_LEAVE_CALENDAR } from "@/lib/leave/services/leave-calendar-engine";
import {
  countPayrollEligibleWorkingDays,
  resolveFullMonthPayrollWorkingDays,
  resolvePayrollApplicablePeriod,
} from "@/lib/payroll/payroll-period";

describe("payroll applicable period", () => {
  it("treats a completed month as past and closed", () => {
    const period = resolvePayrollApplicablePeriod(8, 2026, {
      today: new Date("2026-09-04"),
    });
    assert.equal(period.kind, "past");
    assert.equal(period.isClosed, true);
    assert.equal(period.periodStart, "2026-08-01");
    assert.equal(period.periodEnd, "2026-08-31");
  });

  it("caps the current month at today", () => {
    const period = resolvePayrollApplicablePeriod(9, 2026, {
      today: new Date("2026-09-04"),
    });
    assert.equal(period.kind, "current");
    assert.equal(period.isClosed, false);
    assert.equal(period.periodStart, "2026-09-01");
    assert.equal(period.periodEnd, "2026-09-04");
  });

  it("treats a future month as not started", () => {
    const period = resolvePayrollApplicablePeriod(10, 2026, {
      today: new Date("2026-09-04"),
    });
    assert.equal(period.kind, "future");
    assert.equal(period.isClosed, false);
    assert.equal(period.periodStart, "2026-10-01");
    assert.equal(period.periodEnd, "2026-10-01");
  });

  it("starts mid-month employees on their joining date", () => {
    const period = resolvePayrollApplicablePeriod(9, 2026, {
      today: new Date("2026-09-04"),
      joiningDate: "2026-09-10",
    });
    assert.equal(period.periodStart, "2026-09-10");
    assert.equal(period.periodEnd, "2026-09-04");
  });
});

describe("payroll eligible working days", () => {
  it("counts only elapsed working days for Sep 1–4, 2026", () => {
    const total = countPayrollEligibleWorkingDays(
      "2026-09-01",
      "2026-09-04",
      DEFAULT_LEAVE_CALENDAR,
    );
    assert.equal(total, 4);
  });

  it("returns zero when the applicable window is empty", () => {
    const total = countPayrollEligibleWorkingDays(
      "2026-09-10",
      "2026-09-04",
      DEFAULT_LEAVE_CALENDAR,
    );
    assert.equal(total, 0);
  });

  it("counts full September 2026 working days for daily-rate denominator", () => {
    const total = resolveFullMonthPayrollWorkingDays(9, 2026, DEFAULT_LEAVE_CALENDAR);
    assert.equal(total, 25);
  });
});
