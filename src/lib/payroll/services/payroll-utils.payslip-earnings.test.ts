import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPayslipEarningsLines } from "@/lib/payroll/services/payroll-utils";

describe("getPayslipEarningsLines display mapping", () => {
  it("derives 50/25/10/15 from gross when legacy payslip uses a single salary line", () => {
    const earnings = getPayslipEarningsLines({
      earnings: [
        {
          code: "salary",
          label: "Working Day Salary",
          amount: 12_000,
          type: "earning",
        },
      ],
      basicSalary: 0,
      totalAllowances: 0,
      grossSalary: 12_000,
    });

    assert.deepEqual(
      earnings.map((line) => ({ code: line.code, amount: line.amount })),
      [
        { code: "basic", amount: 6_000 },
        { code: "hra", amount: 3_000 },
        { code: "transport", amount: 1_200 },
        { code: "special_allowance", amount: 1_800 },
      ],
    );
    assert.equal(
      earnings.reduce((sum, line) => sum + line.amount, 0),
      12_000,
    );
  });

  it("keeps an existing standard breakdown when components already reconcile", () => {
    const earnings = getPayslipEarningsLines({
      earnings: [
        { code: "basic", label: "Basic Salary", amount: 25_000, type: "earning" },
        { code: "hra", label: "HRA", amount: 12_500, type: "earning" },
        { code: "transport", label: "LTA", amount: 5_000, type: "earning" },
        { code: "special_allowance", label: "Special", amount: 7_500, type: "earning" },
      ],
      basicSalary: 25_000,
      totalAllowances: 25_000,
      grossSalary: 50_000,
    });

    assert.equal(earnings.length, 4);
    assert.equal(earnings.reduce((sum, line) => sum + line.amount, 0), 50_000);
  });

  it("preserves bonus lines alongside derived structural earnings", () => {
    const earnings = getPayslipEarningsLines({
      earnings: [
        { code: "salary", label: "Salary", amount: 12_000, type: "earning" },
        { code: "bonus_festival", label: "Festival Bonus", amount: 2_000, type: "earning" },
      ],
      basicSalary: 0,
      totalAllowances: 0,
      grossSalary: 14_000,
    });

    assert.equal(earnings.reduce((sum, line) => sum + line.amount, 0), 14_000);
    assert.ok(earnings.some((line) => line.code.startsWith("bonus")));
    assert.equal(
      earnings
        .filter((line) => !line.code.startsWith("bonus"))
        .reduce((sum, line) => sum + line.amount, 0),
      12_000,
    );
  });

  for (const gross of [12_000, 25_000, 50_000]) {
    it(`derives components that sum to ₹${gross.toLocaleString("en-IN")}`, () => {
      const earnings = getPayslipEarningsLines({
        earnings: [{ code: "gross", label: "Gross Salary", amount: gross, type: "earning" }],
        basicSalary: 0,
        totalAllowances: 0,
        grossSalary: gross,
      });
      assert.equal(earnings.reduce((sum, line) => sum + line.amount, 0), gross);
    });
  }
});
