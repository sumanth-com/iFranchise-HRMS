import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countMonthlyAccrualCredits,
  monthStartDate,
  monthsBetweenMonthStarts,
  MONTHLY_ACCRUAL_DAYS_PER_MONTH,
  resolveExpectedEarnedLeaveCarryForward,
  resolveExpectedMonthlyAccrualAllocatedDays,
} from "@/lib/leave/services/leave-monthly-accrual";

describe("leave monthly accrual helpers", () => {
  it("normalizes a date to the first day of its month", () => {
    assert.equal(monthStartDate("2026-08-31"), "2026-08-01");
    assert.equal(monthStartDate("2026-01-01"), "2026-01-01");
  });

  it("counts whole months between month starts", () => {
    assert.equal(monthsBetweenMonthStarts("2026-01-01", "2026-01-01"), 0);
    assert.equal(monthsBetweenMonthStarts("2026-01-01", "2026-02-01"), 1);
    assert.equal(monthsBetweenMonthStarts("2026-01-01", "2026-08-01"), 7);
    assert.equal(monthsBetweenMonthStarts("2025-11-01", "2026-02-01"), 3);
  });

  it("accrues one day per elapsed month", () => {
    const monthsDue = monthsBetweenMonthStarts("2026-01-01", "2026-04-01");
    assert.equal(monthsDue * MONTHLY_ACCRUAL_DAYS_PER_MONTH, 3);
  });

  it("counts inclusive monthly credits from joining month through as-of", () => {
    assert.equal(
      countMonthlyAccrualCredits({
        joiningDate: "2026-01-17",
        balanceYear: 2026,
        asOfDate: "2026-09-22",
      }),
      9,
    );
    assert.equal(
      countMonthlyAccrualCredits({
        joiningDate: "2026-09-01",
        balanceYear: 2026,
        asOfDate: "2026-09-22",
      }),
      1,
    );
    assert.equal(
      countMonthlyAccrualCredits({
        joiningDate: "2025-06-01",
        balanceYear: 2026,
        asOfDate: "2026-09-22",
      }),
      9,
    );
    assert.equal(
      countMonthlyAccrualCredits({
        joiningDate: "2025-12-01",
        balanceYear: 2025,
        asOfDate: "2025-12-31",
      }),
      1,
    );
  });

  it("builds expected CL/EL allocated without stacking on days_per_year seeds", () => {
    assert.equal(
      resolveExpectedMonthlyAccrualAllocatedDays({
        leaveTypeCode: "CL",
        joiningDate: "2026-01-17",
        balanceYear: 2026,
        asOfDate: "2026-09-22",
        daysPerYear: 12,
        carriedFromPreviousYear: 20,
      }),
      9,
    );
    assert.equal(
      resolveExpectedMonthlyAccrualAllocatedDays({
        leaveTypeCode: "EL",
        joiningDate: "2026-01-17",
        balanceYear: 2026,
        asOfDate: "2026-09-22",
        daysPerYear: 12,
        carriedFromPreviousYear: 5,
      }),
      14,
    );
  });

  it("carries prior-year EL from ledger balance when present", () => {
    assert.equal(
      resolveExpectedEarnedLeaveCarryForward({
        joiningDate: "2025-12-01",
        balanceYear: 2026,
        daysPerYear: 12,
        previousYearLedgerBalance: 1,
      }),
      1,
    );
  });

  it("caps seeded prior-year EL ledger at policy-earned remaining", () => {
    // Seeded 12-day 2025 pool cannot carry into 2026 when only Dec was earned.
    assert.equal(
      resolveExpectedEarnedLeaveCarryForward({
        joiningDate: "2025-12-01",
        balanceYear: 2026,
        daysPerYear: 12,
        previousYearLedgerBalance: 12,
        previousYearPaidUsedDays: 0,
      }),
      1,
    );
  });

  it("derives EL carry from prior-year joining credits when ledger is missing", () => {
    // Joined Dec 2025 → one EL credit in 2025, unused → carry 1 into 2026.
    assert.equal(
      resolveExpectedEarnedLeaveCarryForward({
        joiningDate: "2025-12-01",
        balanceYear: 2026,
        daysPerYear: 12,
        previousYearLedgerBalance: null,
        previousYearPaidUsedDays: 0,
      }),
      1,
    );
    // Same joiner who used that one EL day in 2025 → no carry.
    assert.equal(
      resolveExpectedEarnedLeaveCarryForward({
        joiningDate: "2025-12-01",
        balanceYear: 2026,
        daysPerYear: 12,
        previousYearLedgerBalance: null,
        previousYearPaidUsedDays: 1,
      }),
      0,
    );
    // Joined in 2026 → no prior-year EL.
    assert.equal(
      resolveExpectedEarnedLeaveCarryForward({
        joiningDate: "2026-01-17",
        balanceYear: 2026,
        daysPerYear: 12,
        previousYearLedgerBalance: null,
      }),
      0,
    );
  });

  it("does not carry CL across years", () => {
    assert.equal(
      resolveExpectedMonthlyAccrualAllocatedDays({
        leaveTypeCode: "CL",
        joiningDate: "2025-12-01",
        balanceYear: 2026,
        asOfDate: "2026-09-22",
        daysPerYear: 12,
        carriedFromPreviousYear: 99,
      }),
      9,
    );
  });
});
