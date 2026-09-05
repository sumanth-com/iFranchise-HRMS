import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPayslipEarningsLines, resolvePayslipDisplayTotals } from "@/lib/payroll/services/payroll-utils";

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

  it("derives full-time salary components when legacy stipend seed exists on a full-time payslip", () => {
    const earnings = getPayslipEarningsLines({
      earnings: [{ code: "stipend", label: "Stipend", amount: 12_000, type: "earning" }],
      basicSalary: 0,
      totalAllowances: 0,
      grossSalary: 12_000,
      employmentType: "Full Time",
    });

    assert.deepEqual(
      earnings.map((line) => line.code),
      ["basic", "hra", "transport", "special_allowance"],
    );
    assert.equal(earnings.reduce((sum, line) => sum + line.amount, 0), 12_000);
  });

  it("preserves stipend as a single structural earning for intern payslips", () => {
    const earnings = getPayslipEarningsLines({
      earnings: [{ code: "stipend", label: "Stipend", amount: 12_000, type: "earning" }],
      basicSalary: 0,
      totalAllowances: 0,
      grossSalary: 12_000,
      employmentType: "Intern",
    });

    assert.deepEqual(
      earnings.map((line) => ({ code: line.code, amount: line.amount, label: line.label })),
      [{ code: "stipend", amount: 12_000, label: "Stipend" }],
    );
  });

  it("does not add bonus rows when the payroll month has no bonus", () => {
    const august = getPayslipEarningsLines({
      earnings: [
        { code: "basic", label: "Basic Salary", amount: 6_000, type: "earning" },
        { code: "hra", label: "HRA", amount: 3_000, type: "earning" },
        { code: "transport", label: "LTA", amount: 1_200, type: "earning" },
        { code: "special_allowance", label: "Special", amount: 1_800, type: "earning" },
      ],
      basicSalary: 6_000,
      totalAllowances: 0,
      grossSalary: 12_000,
      hrAdjustments: { bonus: 0, incentive: 0, reimbursements: 0 },
    });

    const september = getPayslipEarningsLines({
      earnings: [
        { code: "basic", label: "Basic Salary", amount: 6_000, type: "earning" },
        { code: "hra", label: "HRA", amount: 3_000, type: "earning" },
        { code: "transport", label: "LTA", amount: 1_200, type: "earning" },
        { code: "special_allowance", label: "Special", amount: 1_800, type: "earning" },
        { code: "hr_bonus", label: "Bonus (HR adjustment)", amount: 2_000, type: "earning" },
      ],
      basicSalary: 6_000,
      totalAllowances: 0,
      grossSalary: 12_000,
      hrAdjustments: { bonus: 2_000, incentive: 0, reimbursements: 0 },
    });

    assert.equal(august.length, 4);
    assert.ok(!august.some((line) => line.code.startsWith("bonus") || line.code.startsWith("hr_")));
    assert.equal(september.length, 5);
    assert.ok(september.some((line) => line.code === "hr_bonus"));
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

  it("includes reimbursement and HR adjustment lines in payslip earnings", () => {
    const earnings = getPayslipEarningsLines({
      earnings: [
        { code: "basic", label: "Basic Salary", amount: 6_000, type: "earning" },
        { code: "hra", label: "HRA", amount: 3_000, type: "earning" },
        { code: "transport", label: "LTA", amount: 1_200, type: "earning" },
        { code: "special_allowance", label: "Special", amount: 1_800, type: "earning" },
        { code: "hr_bonus", label: "Bonus (HR adjustment)", amount: 1_000, type: "earning" },
        { code: "hr_incentive", label: "Incentive", amount: 500, type: "earning" },
        { code: "hr_reimbursement", label: "Reimbursement (HR adjustment)", amount: 750, type: "earning" },
      ],
      basicSalary: 6_000,
      totalAllowances: 750,
      grossSalary: 12_000,
    });

    assert.equal(earnings.length, 7);
    assert.equal(earnings.reduce((sum, line) => sum + line.amount, 0), 14_250);
    assert.ok(earnings.some((line) => line.code === "hr_bonus"));
    assert.ok(earnings.some((line) => line.code === "hr_incentive"));
    assert.ok(earnings.some((line) => line.code === "hr_reimbursement"));
  });

  it("derives payslip gross and net pay from all displayed earning lines", () => {
    const totals = resolvePayslipDisplayTotals({
      breakdown: {
        earnings: [
          { code: "basic", label: "Basic Salary", amount: 6_000, type: "earning" },
          { code: "hra", label: "HRA", amount: 3_000, type: "earning" },
          { code: "transport", label: "LTA", amount: 1_200, type: "earning" },
          { code: "special_allowance", label: "Special", amount: 1_800, type: "earning" },
          { code: "hr_bonus", label: "Bonus (HR adjustment)", amount: 1_000, type: "earning" },
        ],
        deductions: [
          { code: "income_tax", label: "Tax Deducted at Source (TDS)", amount: 200, type: "deduction" },
        ],
        attendance: {
          workingDays: 31,
          presentDays: 31,
          absentDays: 0,
          lopDays: 0,
          leaveLopDays: 0,
          overtimeHours: 0,
        },
      },
      basicSalary: 6_000,
      totalAllowances: 0,
      grossSalary: 12_000,
      totalDeductions: 200,
    });

    assert.equal(totals.grossEarnings, 13_000);
    assert.equal(totals.netPay, 12_800);
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
