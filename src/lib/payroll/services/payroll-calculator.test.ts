import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateEmployeePayroll } from "@/lib/payroll/services/payroll-calculator";

const emptyAttendance = {
  presentDays: 22,
  absentDays: 0,
  halfDays: 0,
  onLeaveDays: 0,
  weekOffDays: 4,
  holidayDays: 1,
  overtimeHours: 0,
};

describe("payroll calculator", () => {
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
      attendance: emptyAttendance,
      leaveLopDays: 0,
      bonuses: [],
      reimbursements: [],
    });

    assert.ok(result.breakdown.salaryStructureSnapshot);
    assert.equal(result.breakdown.salaryStructureSnapshot?.salaryStructureId, "struct-1");
    assert.equal(result.breakdown.salaryStructureSnapshot?.basicSalary, 20000);
    assert.equal(result.grossSalary, 27000);
    assert.equal(result.netSalary, 27000);
  });

  it("keeps full gross and deducts LOP as a line item", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      salaryStructure: {
        id: "struct-2",
        employee_id: "emp-2",
        basic_salary: 15000,
        hra_amount: 7500,
        transport_allowance: 3000,
        other_allowances: 0,
        tax_deduction: 0,
        other_deductions: 0,
        gross_salary: 30000,
        net_salary: 30000,
        components: {
          specialAllowance: 4500,
          medical: 0,
          pf: 0,
          esi: 0,
          professionalTax: 200,
          incomeTax: 300,
        },
      },
      attendance: { ...emptyAttendance, absentDays: 0, onLeaveDays: 2 },
      leaveSummary: { lopDays: 2, paidLeaveDays: 3 },
      bonuses: [],
      reimbursements: [],
      settings: { workingDaysCalculation: "fixed_30", lossOfPayDeduction: true },
    });

    const lop = result.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(result.grossSalary, 30000);
    assert.equal(lop?.amount, 2000);
    assert.equal(result.totalDeductions, 2500);
    assert.equal(result.netSalary, 27500);
    assert.equal(result.breakdown.attendance.paidLeaveDays, 3);
  });

  it("does not invent salary when no structure is configured", () => {
    const result = calculateEmployeePayroll({
      month: 8,
      year: 2026,
      salaryStructure: null,
      attendance: emptyAttendance,
      leaveLopDays: 0,
      bonuses: [],
      reimbursements: [],
    });

    assert.equal(result.basicSalary, 0);
    assert.equal(result.grossSalary, 0);
    assert.equal(result.breakdown.salaryStructureSnapshot, undefined);
  });

  it("does not treat approved paid leave as LOP", () => {
    const result = calculateEmployeePayroll({
      month: 8,
      year: 2026,
      salaryStructure: {
        id: "struct-3",
        employee_id: "emp-3",
        basic_salary: 20000,
        hra_amount: 0,
        transport_allowance: 0,
        other_allowances: 0,
        tax_deduction: 0,
        other_deductions: 0,
        gross_salary: 20000,
        net_salary: 20000,
        components: {},
      },
      attendance: { ...emptyAttendance, onLeaveDays: 5, absentDays: 0 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 5 },
      bonuses: [],
      reimbursements: [],
    });

    const lop = result.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(lop, undefined);
    assert.equal(result.grossSalary, 20000);
    assert.equal(result.netSalary, 20000);
  });
});
