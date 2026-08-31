import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  monthStartDate,
  monthsBetweenMonthStarts,
  MONTHLY_ACCRUAL_DAYS_PER_MONTH,
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
});
