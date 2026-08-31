import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateEmployeePayroll } from "@/lib/payroll/services/payroll-calculator";

describe("payroll calculator salary structure snapshot", () => {
  it("embeds applicable structure amounts in the breakdown snapshot", () => {
    const result = calculateEmployeePayroll({
      month: 8,
      year: 2026,
      salaryStructure: {
        id: "struct-1",
        employee_id: "emp-1",
        basic_salary: 20000,
        hra_amount: 5000,
        transport_allowance: 2000,
        other_allowances: 0,
        tax_deduction: 0,
        other_deductions: 0,
        gross_salary: 27000,
        net_salary: 27000,
        components: {
          specialAllowance: 0,
          medical: 0,
          pf: 0,
          esi: 0,
          professionalTax: 0,
          incomeTax: 0,
        },
      },
      attendance: {
        presentDays: 22,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 4,
        holidayDays: 1,
        overtimeHours: 0,
      },
      leaveLopDays: 0,
      bonuses: [],
      reimbursements: [],
    });

    assert.ok(result.breakdown.salaryStructureSnapshot);
    assert.equal(result.breakdown.salaryStructureSnapshot?.salaryStructureId, "struct-1");
    assert.equal(result.breakdown.salaryStructureSnapshot?.basicSalary, 20000);
    assert.equal(result.breakdown.salaryStructureSnapshot?.hraAmount, 5000);
    assert.equal(result.breakdown.salaryStructureSnapshot?.transportAllowance, 2000);
    assert.ok(result.grossSalary > 0);
  });

  it("does not invent salary when no structure is configured", () => {
    const result = calculateEmployeePayroll({
      month: 8,
      year: 2026,
      salaryStructure: null,
      attendance: {
        presentDays: 20,
        absentDays: 2,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 4,
        holidayDays: 1,
        overtimeHours: 0,
      },
      leaveLopDays: 0,
      bonuses: [],
      reimbursements: [],
    });

    assert.equal(result.basicSalary, 0);
    assert.equal(result.grossSalary, 0);
    assert.equal(result.breakdown.salaryStructureSnapshot, undefined);
  });
});
