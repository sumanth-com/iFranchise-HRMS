import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computePublishedAt,
  computeSalaryCreditDate,
  getPreviousPayrollMonthParts,
  isPayslipPublishedToEmployee,
  resolvePayslipAvailability,
} from "@/lib/payroll/services/payslip-publication";

describe("payslip publication schedule (IST)", () => {
  it("publishes August payroll on 5 Sep IST midnight", () => {
    const publishedAt = computePublishedAt("2026-08-01", 5);
    // 2026-09-05 00:00 IST = 2026-09-04 18:30 UTC
    assert.equal(publishedAt, "2026-09-04T18:30:00.000Z");
  });

  it("credits August salary on 2 Sep by default", () => {
    assert.equal(computeSalaryCreditDate("2026-08-01", 2), "2026-09-02");
  });

  it("keeps payslip unavailable before the 5th", () => {
    const publishedAt = computePublishedAt("2026-08-01", 5);
    const before = new Date("2026-09-04T18:29:59.000Z");
    const onOrAfter = new Date("2026-09-04T18:30:00.000Z");
    assert.equal(isPayslipPublishedToEmployee(publishedAt, before), false);
    assert.equal(isPayslipPublishedToEmployee(publishedAt, onOrAfter), true);
  });

  it("shows employee release message before publish date", () => {
    const publishedAt = computePublishedAt("2026-08-01", 5);
    const access = resolvePayslipAvailability(
      publishedAt,
      [],
      new Date("2026-09-01T00:00:00.000Z"),
      { employeeFacing: true },
    );
    assert.equal(access.availability, "under_review");
    assert.equal(access.canEmployeeAccess, false);
    assert.match(access.reviewMessage ?? "", /Payslip will be available on/);
  });

  it("allows HR preview before publish date when not employee-facing", () => {
    const publishedAt = computePublishedAt("2026-08-01", 5);
    const access = resolvePayslipAvailability(
      publishedAt,
      ["payroll.view"],
      new Date("2026-09-01T00:00:00.000Z"),
      { employeeFacing: false },
    );
    assert.equal(access.availability, "available");
    assert.equal(access.canEmployeeAccess, false);
  });

  it("does not treat scheduled publish date alone as employee access", () => {
    const publishedAt = computePublishedAt("2026-08-01", 5);
    const access = resolvePayslipAvailability(
      publishedAt,
      [],
      new Date("2026-09-15T06:30:00.000Z"),
      { employeeFacing: true },
    );
    assert.equal(access.canEmployeeAccess, false);
    assert.equal(access.availability, "under_review");
  });

  it("allows employee access when HR has sent the payslip early", () => {
    const publishedAt = computePublishedAt("2026-08-01", 5);
    const access = resolvePayslipAvailability(
      publishedAt,
      [],
      new Date("2026-09-01T00:00:00.000Z"),
      {
        employeeFacing: true,
        emailSentAt: "2026-09-01T00:00:00.000Z",
      },
    );
    assert.equal(access.availability, "available");
    assert.equal(access.canEmployeeAccess, true);
  });
});

describe("monthly payroll previous month (IST)", () => {
  it("resolves previous month across year boundary", () => {
    // 1 Jan 2026 05:00 IST ≈ 31 Dec 2025 23:30 UTC — use midday IST-safe UTC
    const parts = getPreviousPayrollMonthParts(new Date("2026-01-15T06:30:00.000Z"));
    assert.deepEqual(parts, { month: 12, year: 2025 });
  });

  it("resolves August when now is mid-September IST", () => {
    const parts = getPreviousPayrollMonthParts(new Date("2026-09-15T06:30:00.000Z"));
    assert.deepEqual(parts, { month: 8, year: 2026 });
  });
});
