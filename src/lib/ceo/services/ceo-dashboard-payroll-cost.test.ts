import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sumPayrollFinalPayableTotals } from "@/lib/payroll/services/payroll-utils";

describe("sumPayrollFinalPayableTotals", () => {
  it("sums Final Payable the same way as Team Payroll rows", () => {
    const totals = sumPayrollFinalPayableTotals([
      {
        basicSalary: 10_000,
        grossSalary: 10_000,
        netSalary: 10_000,
        totalDeductions: 0,
        totalAllowances: 600,
        breakdown: {
          earnings: [],
          deductions: [],
          attendance: {
            workingDays: 0,
            presentDays: 0,
            absentDays: 0,
            lopDays: 0,
            leaveLopDays: 0,
            overtimeHours: 0,
          },
          hrAdjustments: { bonus: 0, incentive: 0, reimbursements: 600 },
        },
      },
      {
        basicSalary: 20_000,
        grossSalary: 20_000,
        netSalary: 18_000,
        totalDeductions: 2_000,
        totalAllowances: 0,
        breakdown: null,
      },
    ]);

    assert.equal(totals.employeeCount, 2);
    assert.equal(totals.totalFinalPayable, 28_600);
  });
});
