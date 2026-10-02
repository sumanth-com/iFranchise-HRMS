import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyLeavePolicyToBalanceSnapshot,
  resolveEmploymentServiceMonth,
  resolveInternClStoredBalance,
  resolveInternProbationClEntitlement,
  resolvePolicyAdjustedClBalance,
} from "@/lib/leave/leave-entitlement";

describe("leave entitlement — intern / probation", () => {
  it("returns service month 1 in joining month", () => {
    assert.equal(resolveEmploymentServiceMonth("2026-06-01", "2026-06-15"), 1);
    assert.equal(resolveEmploymentServiceMonth("2026-06-01", "2026-07-01"), 2);
  });

  it("gives zero CL in first month for intern/probation band", () => {
    const entitlement = resolveInternProbationClEntitlement({
      joiningDate: "2026-06-01",
      employmentStatus: "active",
      leaveEligibilityBand: "cl_only",
      asOfDate: "2026-06-15",
    });
    assert.equal(entitlement?.monthlyEntitlement, 0);
    assert.equal(entitlement?.serviceMonth, 1);
  });

  it("gives one CL per month from second month for intern employees", () => {
    const entitlement = resolveInternProbationClEntitlement({
      joiningDate: "2026-06-01",
      employmentStatus: "active",
      leaveEligibilityBand: "cl_only",
      asOfDate: "2026-07-10",
    });
    assert.equal(entitlement?.monthlyEntitlement, 1);
    assert.equal(entitlement?.onProbationWindow, false);
  });

  it("caps available CL by monthly usage for intern/probation", () => {
    const adjusted = resolvePolicyAdjustedClBalance({
      joiningDate: "2026-06-01",
      employmentStatus: "active",
      leaveEligibilityBand: "cl_only",
      asOfDate: "2026-09-04",
      monthUsedDays: 0,
      monthPendingDays: 0,
      probationUsedAndPendingCl: 0,
    });
    assert.equal(adjusted?.allocatedDays, 1);
    assert.equal(adjusted?.balanceDays, 1);
  });

  it("does not adjust full-time confirmed CL balances", () => {
    const snapshot = applyLeavePolicyToBalanceSnapshot(
      {
        leaveTypeCode: "CL",
        leaveTypeName: "Casual Leave",
        allocatedDays: 9,
        usedDays: 2,
        pendingDays: 0,
        balanceDays: 7,
        monthUsedDays: 1,
        monthTotalDays: 9,
        yearTakenDays: 2,
      },
      {
        joiningDate: "2024-01-01",
        employmentStatus: "active",
        leaveEligibilityBand: "full_time_confirmed",
        asOfDate: "2026-09-04",
      },
    );
    assert.equal(snapshot.balanceDays, 7);
    assert.equal(snapshot.allocatedDays, 9);
  });

  it("overrides inflated ledger CL for intern employees", () => {
    const snapshot = applyLeavePolicyToBalanceSnapshot(
      {
        leaveTypeCode: "CL",
        leaveTypeName: "Casual Leave",
        allocatedDays: 9,
        usedDays: 0,
        pendingDays: 0,
        balanceDays: 9,
        monthUsedDays: 0,
        monthTotalDays: 9,
        yearTakenDays: 0,
      },
      {
        joiningDate: "2026-06-01",
        employmentStatus: "active",
        leaveEligibilityBand: "cl_only",
        asOfDate: "2026-09-04",
        monthPendingDays: 0,
        probationUsedAndPendingCl: 0,
      },
    );
    assert.equal(snapshot.allocatedDays, 1);
    assert.equal(snapshot.balanceDays, 1);
  });

  it("gives intern month 1/2/3 a fresh CL and stores the same balance the screen shows", () => {
    const joiningDate = "2026-06-15";
    for (const [asOfDate, expected] of [
      ["2026-06-20", 0],
      ["2026-07-10", 1],
      ["2026-08-03", 1],
    ] as const) {
      const screen = resolvePolicyAdjustedClBalance({
        joiningDate,
        employmentStatus: "probation",
        leaveEligibilityBand: "cl_only",
        asOfDate,
        monthUsedDays: 0,
        monthPendingDays: 0,
        probationUsedAndPendingCl: 2,
      });
      const stored = resolveInternClStoredBalance({
        monthlyEntitlement: screen?.allocatedDays ?? 0,
        yearUsedDays: 2,
        yearPendingDays: 0,
        monthUsedDays: 0,
        monthPendingDays: 0,
      });
      assert.equal(screen?.balanceDays, expected);
      assert.equal(stored.balanceDays, expected);
    }
  });
});
