import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_LEAVE_CALENDAR } from "@/lib/leave/services/leave-calendar-engine";
import {
  calculateEmployeePayroll,
  computeExcelPaidWorkingDays,
  EXCEL_PAYROLL_DAY_DENOMINATOR,
  normalizePayrollCalculationResult,
  resolveProfessionalTaxForMonthlySalary,
} from "@/lib/payroll/services/payroll-calculator";
import {
  resolveFinalPayableAmount,
  roundCurrency,
} from "@/lib/payroll/services/payroll-utils";

const closedSeptember2026 = new Date("2026-10-15");
const closedAugust2026 = new Date("2026-09-15");
const openSeptember10 = new Date("2026-09-10");

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

function structure(gross: number, overrides?: Partial<{
  id: string;
  employee_id: string;
  components: Record<string, unknown>;
}>) {
  const basic = roundCurrency(gross * 0.5);
  const hra = roundCurrency(gross * 0.25);
  const lta = roundCurrency(gross * 0.1);
  const special = roundCurrency(gross - basic - hra - lta);
  return {
    id: overrides?.id ?? "struct",
    employee_id: overrides?.employee_id ?? "emp",
    basic_salary: basic,
    hra_amount: hra,
    transport_allowance: lta,
    other_allowances: special,
    tax_deduction: 0,
    other_deductions: 0,
    gross_salary: gross,
    net_salary: gross,
    components: {
      specialAllowance: special,
      pf: 0,
      esi: 0,
      professionalTax: 0,
      incomeTax: 0,
      ...(overrides?.components ?? {}),
    },
  };
}

describe("payroll calculator — Excel source of truth", () => {
  it("always uses salary / 30 as the daily rate", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: openSeptember10,
      calendar: DEFAULT_LEAVE_CALENDAR,
      salaryStructure: structure(25_000),
      attendance: {
        presentDays: 9,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 0,
        holidayDays: 4,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });

    assert.equal(result.breakdown.attendance.workingDays, EXCEL_PAYROLL_DAY_DENOMINATOR);
    assert.equal(result.breakdown.attendance.dailyRate, roundCurrency(25_000 / 30));
  });

  it("counts holidays as paid days and does not add week_off", () => {
    const paid = computeExcelPaidWorkingDays(
      {
        presentDays: 9,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 4,
        holidayDays: 4,
        overtimeHours: 0,
        lateDays: 0,
      },
      { lopDays: 0, paidLeaveDays: 0 },
    );
    assert.equal(paid, 13);
  });

  it("counts CL/EL (paid leave) in total working days", () => {
    const paid = computeExcelPaidWorkingDays(
      {
        presentDays: 7,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 1,
        weekOffDays: 0,
        holidayDays: 5,
        overtimeHours: 0,
        lateDays: 0,
      },
      { lopDays: 0, paidLeaveDays: 1 },
    );
    assert.equal(paid, 13);
  });

  it("excludes LOP, Absent, and week_off from paid days", () => {
    const paid = computeExcelPaidWorkingDays(
      {
        presentDays: 8,
        absentDays: 2,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 4,
        holidayDays: 4,
        overtimeHours: 0,
        lateDays: 0,
      },
      { lopDays: 1, paidLeaveDays: 0 },
    );
    assert.equal(paid, 12);
  });

  it("applies PT: >=25000 → 200, <25000 → 0 (Feb → 300)", () => {
    assert.equal(resolveProfessionalTaxForMonthlySalary(24_999, 9), 0);
    assert.equal(resolveProfessionalTaxForMonthlySalary(25_000, 9), 200);
    assert.equal(resolveProfessionalTaxForMonthlySalary(50_000, 2), 300);
  });

  it("matches Excel Om: 25000/30*13 - 200 = 10633.33", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: openSeptember10,
      salaryStructure: structure(25_000),
      attendance: {
        presentDays: 9,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 0,
        holidayDays: 4,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });
    assert.equal(result.breakdown.attendance.paidDays, 13);
    assert.equal(result.grossSalary, roundCurrency((25_000 / 30) * 13));
    assert.equal(result.netSalary, roundCurrency((25_000 / 30) * 13 - 200));
    assert.equal(result.netSalary, 10_633.33);
  });

  it("matches Excel Akshita: 7000/30*13 = 3033.33", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: openSeptember10,
      salaryStructure: structure(7_000),
      attendance: {
        presentDays: 9,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 0,
        holidayDays: 4,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });
    assert.equal(result.netSalary, 3_033.33);
    assert.equal(
      result.breakdown.deductions.find((line) => line.code === "pt"),
      undefined,
    );
  });

  it("matches Excel Ekta: 25000/30*13 - 200 = 10633.33", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: openSeptember10,
      salaryStructure: structure(25_000),
      attendance: {
        presentDays: 7,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 0,
        holidayDays: 5,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: { lopDays: 0, paidLeaveDays: 1 },
      bonuses: [],
      reimbursements: [],
    });
    assert.equal(result.breakdown.attendance.paidDays, 13);
    assert.equal(result.netSalary, 10_633.33);
  });

  it("matches Excel Diksha: 50000/30*12 - 200 = 19800", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: openSeptember10,
      salaryStructure: structure(50_000),
      attendance: {
        presentDays: 8,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 0,
        holidayDays: 4,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: { lopDays: 1, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });
    assert.equal(result.breakdown.attendance.paidDays, 12);
    assert.equal(result.netSalary, 19_800);
  });

  it("matches Excel Vivek: 54166.67/30*13 - 200 = 23272.22", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: openSeptember10,
      salaryStructure: structure(54_166.67),
      attendance: {
        presentDays: 9,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 0,
        holidayDays: 4,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });
    assert.equal(result.netSalary, 23_272.22);
  });

  it("aggregates reimbursements once and adds them only on final payout", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: openSeptember10,
      salaryStructure: structure(12_000),
      attendance: {
        presentDays: 7,
        absentDays: 0,
        halfDays: 1,
        onLeaveDays: 0,
        weekOffDays: 0,
        holidayDays: 0,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [
        { amount: 400, category: "travel" },
        { amount: 200, category: "food" },
      ],
    });

    const reimbLines = result.breakdown.earnings.filter((line) =>
      String(line.code).toLowerCase().includes("reimb"),
    );
    assert.equal(reimbLines.length, 1);
    assert.equal(reimbLines[0]?.amount, 600);
    // Net is salary only (3000); reimbursement not inside net.
    assert.equal(result.breakdown.attendance.paidDays, 7.5);
    assert.equal(result.netSalary, 3_000);
    const finalPayable = resolveFinalPayableAmount(
      result.netSalary,
      result.breakdown,
      result.totalAllowances,
    );
    assert.equal(finalPayable, 3_600);
  });

  it("does not use portal access / activation dates — only joiningDate for period bounds", () => {
    const joinedMidMonth = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: openSeptember10,
      joiningDate: "2026-09-09",
      salaryStructure: structure(12_000),
      attendance: {
        presentDays: 2,
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
    });
    // Rate is still /30; paid days come from attendance counts only.
    assert.equal(joinedMidMonth.breakdown.attendance.dailyRate, 400);
    assert.equal(joinedMidMonth.grossSalary, 800);
    assert.equal(joinedMidMonth.netSalary, 800);
  });

  it("ignores workingDaysCalculation overrides for the daily-rate denominator", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure(30_000),
      attendance: {
        presentDays: 20,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 8,
        holidayDays: 2,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
      settings: { workingDaysCalculation: "working_days" },
    });
    assert.equal(result.breakdown.attendance.dailyRate, 1_000);
    // week_off excluded; only P+H = 22
    assert.equal(result.breakdown.attendance.paidDays, 22);
    assert.equal(result.grossSalary, 22_000);
  });
});

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
    assert.equal(result.breakdown.attendance.dailyRate, 900);
  });

  it("prorates gross by Excel paid days and shows LOP at daily rate", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure(30_000, {
        id: "struct-2",
        components: { incomeTax: 300 },
      }),
      attendance: {
        presentDays: 22,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 2,
        weekOffDays: 0,
        holidayDays: 0,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: { lopDays: 2, paidLeaveDays: 3 },
      bonuses: [],
      reimbursements: [],
      settings: { lossOfPayDeduction: true },
    });

    const lop = result.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(result.breakdown.attendance.workingDays, 30);
    assert.equal(result.breakdown.attendance.paidDays, 25);
    assert.equal(result.grossSalary, 25_000);
    assert.equal(lop?.amount, 2_000);
    assert.equal(result.totalDeductions, 500);
    assert.equal(result.netSalary, 24_500);
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
      salaryStructure: structure(20_000, { id: "struct-3" }),
      attendance: {
        presentDays: 22,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 5,
        weekOffDays: 4,
        holidayDays: 3,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: { lopDays: 0, paidLeaveDays: 5 },
      bonuses: [],
      reimbursements: [],
    });

    const lop = result.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(lop, undefined);
    // P(22)+H(3)+CL/EL(5) = 30; week_off ignored
    assert.equal(result.breakdown.attendance.paidDays, 30);
    assert.equal(result.grossSalary, 20_000);
  });

  it("adds half-day LOP after three late entries in the month", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure(30_000, { id: "struct-4" }),
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
      salaryStructure: structure(30_000, {
        id: "struct-5",
        components: { incomeTax: 300 },
      }),
      attendance: {
        presentDays: 0,
        absentDays: 30,
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
      settings: { lossOfPayDeduction: true },
    });

    assert.equal(result.grossSalary, 0);
    assert.equal(result.netSalary, 0);
    assert.ok(result.netSalary >= 0);
  });

  it("uses Excel /30 rate even for the open current month", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: new Date("2026-09-04"),
      calendar: DEFAULT_LEAVE_CALENDAR,
      salaryStructure: structure(30_000, { id: "struct-current" }),
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
    });

    assert.equal(result.breakdown.attendance.workingDays, 30);
    assert.equal(result.breakdown.attendance.paidDays, 3);
    assert.equal(result.breakdown.attendance.dailyRate, 1_000);
    assert.equal(result.grossSalary, 3_000);
  });

  it("shows zero attendance for a future payroll month", () => {
    const result = calculateEmployeePayroll({
      month: 10,
      year: 2026,
      asOfDate: new Date("2026-09-04"),
      calendar: DEFAULT_LEAVE_CALENDAR,
      salaryStructure: structure(30_000, { id: "struct-future" }),
      attendance: emptyAttendance,
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
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

  it("emits a single aggregated reimbursement earning line", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure(30_000, { id: "struct-reimb" }),
      attendance: emptyAttendance,
      leaveLopDays: 0,
      bonuses: [],
      reimbursements: [
        { amount: 500, category: "food" },
        { amount: 150.76, category: "other" },
      ],
    });

    const reimbursementLines = result.breakdown.earnings.filter((line) =>
      line.label.toLowerCase().includes("reimbursement"),
    );
    assert.equal(reimbursementLines.length, 1);
    assert.equal(reimbursementLines[0]?.code, "reimbursement");
    assert.equal(reimbursementLines[0]?.amount, 650.76);
    assert.ok(result.totalAllowances >= 650.76);
    assert.deepEqual(result.breakdown.reimbursementBreakdown, [
      { category: "food", amount: 500 },
      { category: "other", amount: 150.76 },
    ]);
  });
});
