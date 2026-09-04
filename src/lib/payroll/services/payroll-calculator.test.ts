import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_LEAVE_CALENDAR } from "@/lib/leave/services/leave-calendar-engine";
import { monthlyGrossPerDay } from "@/lib/payroll/salary-structure-period";
import {
  calculateEmployeePayroll,
  normalizePayrollCalculationResult,
} from "@/lib/payroll/services/payroll-calculator";
import { roundCurrency } from "@/lib/payroll/services/payroll-utils";

const closedSeptember2026 = new Date("2026-10-15");

const closedAugust2026 = new Date("2026-09-15");

const emptyAttendance = {
  presentDays: 31,
  absentDays: 0,
  halfDays: 0,
  onLeaveDays: 0,
  weekOffDays: 4,
  holidayDays: 1,
  overtimeHours: 0,
  lateDays: 0,
};

describe("payroll calculator", () => {
  it("embeds applicable structure amounts in the breakdown snapshot", () => {
    const result = calculateEmployeePayroll({
      month: 8,
      year: 2026,
      asOfDate: closedAugust2026,
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
    assert.equal(result.breakdown.salaryStructureSnapshot?.basicSalary, 13_500);
    assert.equal(result.grossSalary, 27_000);
    assert.equal(result.netSalary, 27_000);
    const earningCodes = result.breakdown.earnings.map((line) => line.code);
    assert.deepEqual(earningCodes, ["basic", "hra", "transport", "special_allowance"]);
  });

  it("prorates gross by payable days and shows LOP at daily rate", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
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
      attendance: { ...emptyAttendance, presentDays: 22, absentDays: 0, onLeaveDays: 2 },
      leaveSummary: { lopDays: 2, paidLeaveDays: 3 },
      bonuses: [],
      reimbursements: [],
      settings: { workingDaysCalculation: "fixed_30", lossOfPayDeduction: true },
    });

    const lop = result.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(result.breakdown.attendance.workingDays, 30);
    assert.equal(result.breakdown.attendance.paidDays, 25);
    assert.equal(result.grossSalary, 25_000);
    assert.equal(lop?.amount, 2_000);
    assert.equal(result.totalDeductions, 500);
    assert.equal(result.netSalary, 24_500);
    assert.equal(result.breakdown.attendance.paidLeaveDays, 3);
  });

  it("uses daily rate × payable days for the user-specified payroll example", () => {
    const result = calculateEmployeePayroll({
      month: 8,
      year: 2026,
      asOfDate: closedAugust2026,
      salaryStructure: {
        id: "struct-example",
        employee_id: "emp-example",
        basic_salary: 15000,
        hra_amount: 7500,
        transport_allowance: 3000,
        other_allowances: 4500,
        tax_deduction: 0,
        other_deductions: 0,
        gross_salary: 30000,
        net_salary: 30000,
        components: {},
      },
      attendance: {
        presentDays: 18,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 2,
        weekOffDays: 8,
        holidayDays: 0,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: { lopDays: 2, paidLeaveDays: 2 },
      bonuses: [],
      reimbursements: [],
      settings: { workingDaysCalculation: "working_days", lossOfPayDeduction: true },
    });

    const perDay = monthlyGrossPerDay(30_000, result.breakdown.attendance.workingDays);
    assert.equal(result.breakdown.attendance.paidDays, 20);
    assert.equal(result.grossSalary, roundCurrency((20 * 30_000) / result.breakdown.attendance.workingDays));
    assert.equal(result.breakdown.attendance.dailyRate, perDay);
    assert.equal(
      result.breakdown.deductions.find((line) => line.code === "lop")?.amount,
      roundCurrency((2 * 30_000) / result.breakdown.attendance.workingDays),
    );
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
      asOfDate: closedAugust2026,
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
      attendance: { ...emptyAttendance, presentDays: 22, onLeaveDays: 5, absentDays: 0 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 5 },
      bonuses: [],
      reimbursements: [],
    });

    const lop = result.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(lop, undefined);
    const expectedGross = roundCurrency((27 * 20_000) / 31);
    assert.equal(result.grossSalary, expectedGross);
    assert.equal(result.netSalary, expectedGross);
  });

  it("adds half-day LOP after three late entries in the month", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: {
        id: "struct-4",
        employee_id: "emp-4",
        basic_salary: 15000,
        hra_amount: 7500,
        transport_allowance: 3000,
        other_allowances: 4500,
        tax_deduction: 0,
        other_deductions: 0,
        gross_salary: 30000,
        net_salary: 30000,
        components: {},
      },
      attendance: { ...emptyAttendance, lateDays: 3 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });

    const lop = result.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(lop?.amount, 500);
    assert.equal(result.breakdown.attendance.lopDays, 0.5);
  });

  it("never produces negative net pay when LOP and statutory deductions exceed gross", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: {
        id: "struct-5",
        employee_id: "emp-5",
        basic_salary: 15000,
        hra_amount: 7500,
        transport_allowance: 3000,
        other_allowances: 4500,
        tax_deduction: 0,
        other_deductions: 0,
        gross_salary: 30000,
        net_salary: 30000,
        components: {
          professionalTax: 200,
          incomeTax: 300,
        },
      },
      attendance: { ...emptyAttendance, presentDays: 0, absentDays: 30 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
      settings: { workingDaysCalculation: "fixed_30", lossOfPayDeduction: true },
    });

    assert.equal(result.grossSalary, 0);
    assert.equal(result.netSalary, 0);
    assert.equal(result.totalDeductions, 0);
    assert.equal(result.netSalary, result.grossSalary - result.totalDeductions);
    assert.ok(result.netSalary >= 0);
  });

  it("caps working and paid days to the elapsed current month", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: new Date("2026-09-04"),
      calendar: DEFAULT_LEAVE_CALENDAR,
      salaryStructure: {
        id: "struct-current",
        employee_id: "emp-current",
        basic_salary: 15000,
        hra_amount: 7500,
        transport_allowance: 3000,
        other_allowances: 4500,
        tax_deduction: 0,
        other_deductions: 0,
        gross_salary: 30000,
        net_salary: 30000,
        components: {},
      },
      attendance: {
        presentDays: 3,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 0,
        holidayDays: 0,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
      settings: { workingDaysCalculation: "fixed_30", lossOfPayDeduction: true },
    });

    const fullMonthWorkingDays = 25;
    const perDay = roundCurrency(30_000 / fullMonthWorkingDays);

    assert.equal(result.breakdown.attendance.workingDays, 4);
    assert.equal(result.breakdown.attendance.paidDays, 3);
    assert.equal(result.breakdown.attendance.dailyRate, perDay);
    assert.equal(result.grossSalary, roundCurrency(perDay * 3));
  });

  it("shows zero attendance for a future payroll month", () => {
    const result = calculateEmployeePayroll({
      month: 10,
      year: 2026,
      asOfDate: new Date("2026-09-04"),
      calendar: DEFAULT_LEAVE_CALENDAR,
      salaryStructure: {
        id: "struct-future",
        employee_id: "emp-future",
        basic_salary: 15000,
        hra_amount: 7500,
        transport_allowance: 3000,
        other_allowances: 4500,
        tax_deduction: 0,
        other_deductions: 0,
        gross_salary: 30000,
        net_salary: 30000,
        components: {},
      },
      attendance: emptyAttendance,
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
      settings: { workingDaysCalculation: "fixed_30", lossOfPayDeduction: true },
    });

    assert.equal(result.breakdown.attendance.workingDays, 0);
    assert.equal(result.breakdown.attendance.paidDays, 0);
  });

  it("normalizes invalid persisted amounts before database writes", () => {
    const normalized = normalizePayrollCalculationResult({
      basicSalary: 20000,
      totalAllowances: 10000,
      totalDeductions: 15000,
      grossSalary: 10000,
      netSalary: -5000,
      breakdown: {
        earnings: [{ code: "basic", label: "Basic", amount: 10000, type: "earning" }],
        deductions: [
          { code: "pf", label: "PF", amount: 5000, type: "deduction" },
          { code: "lop", label: "LOP", amount: 30000, type: "deduction" },
        ],
        attendance: {
          workingDays: 30,
          presentDays: 0,
          absentDays: 30,
          lopDays: 30,
          leaveLopDays: 0,
          overtimeHours: 0,
          leaveDays: 0,
          paidDays: 0,
          paidLeaveDays: 0,
          holidayCount: 0,
          weekOffDays: 0,
        },
      },
    });

    assert.equal(normalized.netSalary, 5000);
    assert.equal(normalized.totalDeductions, 5000);
    assert.equal(normalized.netSalary, normalized.grossSalary - normalized.totalDeductions);
  });
});
