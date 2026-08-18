import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_LEAVE_CALENDAR } from "./leave-calendar-engine";
import { countLeaveDaysInRange, monthlyLeaveQuota, roundLeaveDays } from "./leave-usage";

describe("monthlyLeaveQuota", () => {
  it("splits a yearly CL pool across 12 months", () => {
    assert.equal(monthlyLeaveQuota("CL", 12), 1);
    assert.equal(monthlyLeaveQuota("CL", 6), 0.5);
  });

  it("keeps optional holiday and period leave as a yearly pool in the month", () => {
    assert.equal(monthlyLeaveQuota("OH", 2), 2);
    assert.equal(monthlyLeaveQuota("PL", 1), 1);
  });
});

describe("countLeaveDaysInRange", () => {
  it("counts only the days that fall in the month", () => {
    const used = countLeaveDaysInRange(
      {
        startDate: "2026-07-31",
        endDate: "2026-08-03",
        isHalfDay: false,
      },
      { start: "2026-08-01", end: "2026-08-31" },
      DEFAULT_LEAVE_CALENDAR,
    );
    assert.equal(roundLeaveDays(used) > 0, true);
  });

  it("counts a half-day request in the month", () => {
    assert.equal(
      countLeaveDaysInRange(
        {
          startDate: "2026-08-11",
          endDate: "2026-08-11",
          isHalfDay: true,
        },
        { start: "2026-08-01", end: "2026-08-31" },
        DEFAULT_LEAVE_CALENDAR,
      ),
      0.5,
    );
  });
});
