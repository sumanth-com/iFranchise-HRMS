import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mapPayrollDisplayAmounts,
  resolveFinalPayableAmount,
  resolvePayrollReimbursement,
} from "@/lib/payroll/services/payroll-utils";
import type { PayrollBreakdown } from "@/types/payroll";

const baseAttendance = {
  workingDays: 30,
  presentDays: 21,
  absentDays: 0,
  lopDays: 0,
  leaveLopDays: 0,
  overtimeHours: 0,
};

function breakdown(partial: Partial<PayrollBreakdown>): PayrollBreakdown {
  return {
    earnings: [],
    deductions: [],
    attendance: baseAttendance,
    ...partial,
  };
}

describe("resolvePayrollReimbursement explicit 0 persistence", () => {
  it("keeps HR reimbursement 0 even when claim earning lines still have an amount", () => {
    const bd = breakdown({
      earnings: [
        {
          code: "reimbursement",
          label: "Reimbursement",
          amount: 160,
          type: "earning",
        },
      ],
      hrAdjustments: { reimbursements: 0, bonus: 0, incentive: 0 },
    });

    assert.equal(resolvePayrollReimbursement(bd, 4326.66), 0);
    assert.equal(resolveFinalPayableAmount(8333.33, bd, 4326.66), 8333.33);
    assert.equal(
      mapPayrollDisplayAmounts({
        basicSalary: 4166.66,
        grossSalary: 8333.33,
        netSalary: 8333.33,
        totalDeductions: 0,
        totalAllowances: 4326.66,
        breakdown: bd,
      }).reimbursement,
      0,
    );
  });

  it("keeps HR reimbursement 0 over stale excel.reimbursement", () => {
    const bd = breakdown({
      excel: { reimbursement: 160, finalPayout: 8493 },
      hrAdjustments: { reimbursements: 0 },
    });
    assert.equal(resolvePayrollReimbursement(bd), 0);
  });

  it("uses excel.finalPayout when HR extras are all zero", () => {
    const bd = breakdown({
      excel: { finalPayout: 8333, reimbursement: 0 },
      hrAdjustments: { bonus: 0, incentive: 0, reimbursements: 0 },
    });
    assert.equal(resolveFinalPayableAmount(8333.33, bd, 4166.66), 8333);
  });

  it("uses positive HR reimbursement when explicitly set", () => {
    const bd = breakdown({
      hrAdjustments: { reimbursements: 400 },
    });
    assert.equal(resolvePayrollReimbursement(bd), 400);
  });
});
