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
  sumPayrollEmployeeRowTotals,
  sumPayrollFinalPayableTotals,
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

function septRow(input: {
  salary: number;
  present: number;
  holiday: number;
  cl?: number;
  el?: number;
  lop?: number;
  absent?: number;
}) {
  const cl = input.cl ?? 0;
  const el = input.el ?? 0;
  return calculateEmployeePayroll({
    month: 9,
    year: 2026,
    asOfDate: closedSeptember2026,
    calendar: DEFAULT_LEAVE_CALENDAR,
    salaryStructure: structure(input.salary),
    attendance: {
      presentDays: input.present,
      absentDays: input.absent ?? 0,
      halfDays: 0,
      onLeaveDays: 0,
      weekOffDays: 0,
      holidayDays: input.holiday,
      overtimeHours: 0,
      lateDays: 0,
    },
    leaveSummary: {
      lopDays: input.lop ?? 0,
      paidLeaveDays: cl + el,
      clDays: cl,
      elDays: el,
    },
    bonuses: [],
    reimbursements: [],
  });
}

describe("payroll calculator — Excel Attendance Sheet formula", () => {
  it("Total Working Days = Present + Holiday + CL + EL", () => {
    assert.equal(
      computeExcelPaidWorkingDays(
        {
          presentDays: 19,
          absentDays: 0,
          halfDays: 0,
          onLeaveDays: 0,
          weekOffDays: 0,
          holidayDays: 4,
          overtimeHours: 0,
          lateDays: 0,
        },
        { lopDays: 0, paidLeaveDays: 2 },
      ),
      25,
    );
  });

  it("counts Present + Holiday as paid days", () => {
    const paid = computeExcelPaidWorkingDays(
      {
        presentDays: 21,
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
    assert.equal(paid, 25);
  });

  it("counts CL as paid days", () => {
    const result = septRow({
      salary: 25_000,
      present: 18,
      holiday: 5,
      cl: 2,
    });
    assert.equal(result.breakdown.attendance.clDays, 2);
    assert.equal(result.breakdown.attendance.paidDays, 25);
    assert.equal(result.grossSalary, 25_000);
  });

  it("counts EL as paid days", () => {
    const result = septRow({
      salary: 25_000,
      present: 19,
      holiday: 4,
      cl: 1,
      el: 1,
    });
    assert.equal(result.breakdown.attendance.elDays, 1);
    assert.equal(result.breakdown.attendance.paidDays, 25);
    assert.equal(result.grossSalary, 25_000);
  });

  it("excludes LOP from Total Working Days", () => {
    const paid = computeExcelPaidWorkingDays(
      {
        presentDays: 20,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 0,
        holidayDays: 4,
        overtimeHours: 0,
        lateDays: 0,
      },
      { lopDays: 1, paidLeaveDays: 0 },
    );
    assert.equal(paid, 24);
    const result = septRow({
      salary: 50_000,
      present: 20,
      holiday: 4,
      lop: 1,
    });
    assert.equal(result.breakdown.attendance.paidDays, 24);
    assert.equal(result.grossSalary, roundCurrency(50_000 - 50_000 / 30));
  });

  it("excludes Absent from Total Working Days", () => {
    const result = septRow({
      salary: 30_000,
      present: 9,
      holiday: 2,
      cl: 1,
      lop: 1,
      absent: 17,
    });
    assert.equal(result.breakdown.attendance.paidDays, 12);
    assert.equal(result.grossSalary, 12_000);
  });

  it("always uses salary / 30 as the daily rate", () => {
    const result = septRow({ salary: 25_000, present: 19, holiday: 4, cl: 1, el: 1 });
    assert.equal(result.breakdown.attendance.workingDays, EXCEL_PAYROLL_DAY_DENOMINATOR);
    assert.equal(result.breakdown.attendance.dailyRate, roundCurrency(25_000 / 30));
  });

  it("applies PT: >=25000 → 200, <25000 → 0 (Feb → 300)", () => {
    assert.equal(resolveProfessionalTaxForMonthlySalary(24_999, 9), 0);
    assert.equal(resolveProfessionalTaxForMonthlySalary(25_000, 9), 200);
    assert.equal(resolveProfessionalTaxForMonthlySalary(50_000, 2), 300);
  });

  it("keeps full monthly salary when CL and EL are paid and there is no LOP", () => {
    const result = septRow({
      salary: 25_000,
      present: 19,
      holiday: 4,
      cl: 1,
      el: 1,
    });
    assert.equal(result.breakdown.attendance.paidDays, 25);
    assert.equal(result.grossSalary, 25_000);
    assert.equal(result.netSalary, 24_800);
  });

  it("keeps full monthly salary for present and holiday with no LOP", () => {
    const result = septRow({ salary: 25_000, present: 21, holiday: 4 });
    assert.equal(result.grossSalary, 25_000);
    assert.equal(result.netSalary, 24_800);
  });

  it("keeps a below-PT salary whole when there is no LOP", () => {
    const result = septRow({ salary: 7_000, present: 21, holiday: 4 });
    assert.equal(result.grossSalary, 7_000);
    assert.equal(result.netSalary, 7_000);
  });

  it("does not reduce salary for CL when there is no LOP", () => {
    const result = septRow({ salary: 25_000, present: 18, holiday: 5, cl: 2 });
    assert.equal(result.breakdown.attendance.paidDays, 25);
    assert.equal(result.grossSalary, 25_000);
    assert.equal(result.netSalary, 24_800);
  });

  it("deducts one recorded LOP day from the full monthly salary", () => {
    const result = septRow({ salary: 50_000, present: 20, holiday: 4, lop: 1 });
    assert.equal(result.breakdown.attendance.paidDays, 24);
    assert.equal(result.grossSalary, roundCurrency(50_000 - 50_000 / 30));
    assert.equal(result.netSalary, roundCurrency(result.grossSalary - 200));
  });

  it("keeps full monthly salary for a completed month with no LOP", () => {
    const result = septRow({ salary: 50_000, present: 21, holiday: 4 });
    assert.equal(result.grossSalary, 50_000);
    assert.equal(result.netSalary, 49_800);
  });

  it("keeps a stipend whole when there is no LOP", () => {
    const result = septRow({ salary: 12_000, present: 21, holiday: 4 });
    assert.equal(result.grossSalary, 12_000);
    assert.equal(result.netSalary, 12_000);
  });

  it("does not reduce ₹10,000 salaries for CL or present-only months without LOP", () => {
    for (const row of [
      { present: 20, holiday: 4, cl: 1 },
      { present: 21, holiday: 4 },
      { present: 21, holiday: 4 },
      { present: 21, holiday: 4 },
    ]) {
      const result = septRow({ salary: 10_000, ...row });
      assert.equal(result.grossSalary, 10_000);
      assert.equal(result.netSalary, 10_000);
    }
  });

  it("keeps Vivek's monthly salary when CL is paid and there is no LOP", () => {
    const result = septRow({
      salary: 54_166.67,
      present: 20,
      holiday: 4,
      cl: 1,
    });
    assert.equal(result.grossSalary, 54_166.67);
    assert.equal(result.netSalary, roundCurrency(54_166.67 - 200));
  });

  it("keeps ₹50,000 salaries whole when there is no LOP", () => {
    for (const _ of [0, 1]) {
      const result = septRow({ salary: 50_000, present: 21, holiday: 4 });
      assert.equal(result.grossSalary, 50_000);
      assert.equal(result.netSalary, 49_800);
    }
  });

  it("matches Sept-2026 Excel Anmol mixed attendance: 9+2+1=12 → ₹12,000 − PT ₹200", () => {
    const result = septRow({
      salary: 30_000,
      present: 9,
      holiday: 2,
      cl: 1,
      lop: 1,
      absent: 17,
    });
    assert.equal(result.breakdown.attendance.paidDays, 12);
    assert.equal(result.grossSalary, 12_000);
    assert.equal(result.netSalary, 11_800);
  });

  it("adds approved reimbursement only on final payout", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure(12_000),
      attendance: {
        presentDays: 21,
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
    assert.equal(result.breakdown.attendance.paidDays, 25);
    assert.equal(result.grossSalary, 12_000);
    assert.equal(result.netSalary, 12_000);
    const finalPayable = resolveFinalPayableAmount(
      result.netSalary,
      result.breakdown,
      result.totalAllowances,
    );
    assert.equal(finalPayable, 12_600);
  });

  it("dashboard totals equal the sum of employee-row amounts", () => {
    const rows = [
      septRow({ salary: 25_000, present: 19, holiday: 4, cl: 1, el: 1 }),
      septRow({ salary: 50_000, present: 20, holiday: 4, lop: 1 }),
      septRow({ salary: 7_000, present: 21, holiday: 4 }),
      septRow({
        salary: 30_000,
        present: 9,
        holiday: 2,
        cl: 1,
        lop: 1,
        absent: 17,
      }),
    ];
    const totals = sumPayrollEmployeeRowTotals(rows);

    assert.equal(totals.employeeCount, 4);
    assert.equal(
      totals.totalGross,
      roundCurrency(rows.reduce((sum, row) => sum + row.grossSalary, 0)),
    );
    assert.equal(
      totals.totalDeductions,
      roundCurrency(rows.reduce((sum, row) => sum + row.totalDeductions, 0)),
    );
    assert.equal(
      totals.totalNet,
      roundCurrency(rows.reduce((sum, row) => sum + row.netSalary, 0)),
    );
    assert.equal(rows[0]?.grossSalary, 25_000);
    assert.equal(rows[1]?.grossSalary, roundCurrency(50_000 - 50_000 / 30));
    assert.equal(rows[2]?.grossSalary, 7_000);
    assert.equal(rows[3]?.grossSalary, 12_000);
    assert.equal(
      totals.totalGross,
      roundCurrency(rows.reduce((sum, row) => sum + row.grossSalary, 0)),
    );
  });

  it("CEO Payroll Cost final-payable total matches the sum of Team Payroll row final payables", () => {
    // September sheet example payouts (attendance-driven final payable, not net-only).
    const finalPayables = [
      20_633, 20_633, 5_833, 20_633, 39_800, 41_467, 10_000, 8_333, 8_333, 8_333,
      44_939, 8_333, 41_467, 41_467, 11_800,
    ];
    const rows = finalPayables.map((finalPayable) => ({
      basicSalary: finalPayable,
      grossSalary: finalPayable,
      netSalary: finalPayable,
      totalDeductions: 0,
      totalAllowances: 0,
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
        excel: { finalPayout: finalPayable },
      },
    }));

    const totals = sumPayrollFinalPayableTotals(rows);
    assert.equal(totals.employeeCount, 15);
    assert.equal(totals.totalFinalPayable, 332_004);
  });

  it("keeps the full monthly salary when paid days are below 30 and there is no LOP", () => {
    const result = septRow({
      salary: 25_000,
      present: 19,
      holiday: 4,
      cl: 1,
      el: 1,
    });
    assert.equal(result.breakdown.attendance.paidDays, 25);
    assert.equal(result.grossSalary, 25_000);
    assert.equal(result.netSalary, 24_800);
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
    assert.equal(result.grossSalary, 28_000);
    assert.equal(lop?.amount, 2_000);
    assert.equal(result.totalDeductions, 500);
    assert.equal(result.netSalary, 27_500);
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
      asOfDate: openSeptember10,
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
    assert.equal(result.grossSalary, 30_000);
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
    assert.equal(result.grossSalary, 0);
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
    assert.equal(result.breakdown.attendance.paidDays, 22);
    assert.equal(result.grossSalary, 30_000);
  });

  it("normalizes invalid persisted amounts before database writes", () => {
    const normalized = normalizePayrollCalculationResult({
      basicSalary: 20000,
      totalAllowances: 10000,
      totalDeductions: 15000,
      grossSalary: 10000,
      netSalary: -5000,
      breakdown: {
        earnings: [
          { code: "basic", label: "Basic", amount: 20000, type: "earning" },
        ],
        deductions: [
          { code: "lop", label: "LOP", amount: 5000, type: "deduction" },
          { code: "pt", label: "PT", amount: 200, type: "deduction" },
          { code: "income_tax", label: "TDS", amount: 14800, type: "deduction" },
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
        },
      },
    });

    assert.ok(normalized.netSalary >= 0);
    assert.equal(
      normalized.netSalary,
      roundCurrency(normalized.grossSalary - normalized.totalDeductions),
    );
    assert.ok(normalized.totalDeductions <= normalized.grossSalary);
  });

  it("pays only day-1 facts on the first day of an open month", () => {
    const result = calculateEmployeePayroll({
      month: 10,
      year: 2026,
      asOfDate: new Date("2026-10-01"),
      calendar: DEFAULT_LEAVE_CALENDAR,
      salaryStructure: structure(30_000, { id: "struct-oct-1" }),
      attendance: { ...emptyAttendance, presentDays: 1, holidayDays: 0, weekOffDays: 0 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });

    assert.equal(result.breakdown.attendance.workingDays, 30);
    assert.equal(result.breakdown.attendance.paidDays, 1);
    assert.equal(result.breakdown.attendance.dailyRate, 1_000);
    assert.equal(result.grossSalary, 30_000);
  });

  it("pays present, holiday, CL, and EL through mid-month and excludes future days", () => {
    const result = calculateEmployeePayroll({
      month: 10,
      year: 2026,
      asOfDate: new Date("2026-10-15"),
      calendar: DEFAULT_LEAVE_CALENDAR,
      salaryStructure: structure(30_000, { id: "struct-oct-15" }),
      attendance: {
        ...emptyAttendance,
        presentDays: 8,
        holidayDays: 2,
      },
      leaveSummary: { lopDays: 1, paidLeaveDays: 2, clDays: 1, elDays: 1 },
      bonuses: [],
      reimbursements: [],
    });

    assert.equal(result.breakdown.attendance.paidDays, 12);
    assert.equal(result.grossSalary, 29_000);
    assert.equal(result.breakdown.attendance.lopDays, 1);
    const lop = result.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(lop?.amount, 1_000);
    assert.equal(result.totalDeductions, 200);
    assert.equal(result.netSalary, 28_800);
  });

  it("does not pay invented attendance for a future month", () => {
    const result = calculateEmployeePayroll({
      month: 11,
      year: 2026,
      asOfDate: new Date("2026-10-15"),
      calendar: DEFAULT_LEAVE_CALENDAR,
      salaryStructure: structure(30_000, { id: "struct-nov" }),
      attendance: { ...emptyAttendance, presentDays: 20, holidayDays: 4 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 2 },
      bonuses: [],
      reimbursements: [],
    });

    assert.equal(result.breakdown.attendance.paidDays, 0);
    assert.equal(result.grossSalary, 0);
  });

  it("turns three late entries into half-day LOP at the daily rate", () => {
    const result = calculateEmployeePayroll({
      month: 10,
      year: 2026,
      asOfDate: new Date("2026-10-15"),
      salaryStructure: structure(30_000, { id: "struct-late" }),
      attendance: { ...emptyAttendance, presentDays: 8, lateDays: 3 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });

    assert.equal(result.breakdown.attendance.lopDays, 0.5);
    assert.equal(
      result.breakdown.deductions.find((line) => line.code === "lop")?.amount,
      500,
    );
    assert.equal(result.grossSalary, 29_500);
    assert.equal(result.netSalary, roundCurrency(29_500 - 200));
  });

  it("pays the full monthly salary on day 1 and day 2 when there is no LOP", () => {
    for (const asOfDate of [new Date("2026-10-01"), new Date("2026-10-02")]) {
      const result = calculateEmployeePayroll({
        month: 10,
        year: 2026,
        asOfDate,
        salaryStructure: structure(25_000),
        attendance: { ...emptyAttendance, presentDays: 1, holidayDays: 0, weekOffDays: 0 },
        leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
        bonuses: [],
        reimbursements: [],
      });
      assert.equal(result.grossSalary, 25_000);
      assert.equal(result.totalDeductions, 200);
      assert.equal(result.netSalary, 24_800);
    }
  });

  it("deducts one full LOP, two LOP days, and a half-day LOP from the full salary", () => {
    const one = calculateEmployeePayroll({
      month: 10,
      year: 2026,
      asOfDate: new Date("2026-10-02"),
      salaryStructure: structure(25_000),
      attendance: { ...emptyAttendance, presentDays: 1, absentDays: 1, holidayDays: 0, weekOffDays: 0 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });
    assert.equal(one.grossSalary, roundCurrency(25_000 - 25_000 / 30));
    assert.equal(one.netSalary, roundCurrency(one.grossSalary - 200));

    const two = calculateEmployeePayroll({
      month: 12,
      year: 2026,
      asOfDate: new Date("2026-12-10"),
      salaryStructure: structure(25_000),
      attendance: { ...emptyAttendance, presentDays: 4, absentDays: 2, holidayDays: 0, weekOffDays: 0 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });
    assert.equal(two.grossSalary, roundCurrency(25_000 - (25_000 / 30) * 2));
    assert.equal(two.netSalary, roundCurrency(two.grossSalary - 200));

    const half = calculateEmployeePayroll({
      month: 11,
      year: 2026,
      asOfDate: new Date("2026-11-06"),
      salaryStructure: structure(25_000),
      attendance: { ...emptyAttendance, presentDays: 3, halfDays: 1, holidayDays: 0, weekOffDays: 0 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });
    assert.equal(half.breakdown.attendance.lopDays, 0.5);
    assert.equal(half.grossSalary, roundCurrency(25_000 - (25_000 / 30) * 0.5));
  });

  it("does not reduce salary for CL or EL, and adds reimbursement after PT", () => {
    const leave = calculateEmployeePayroll({
      month: 10,
      year: 2026,
      asOfDate: new Date("2026-10-02"),
      salaryStructure: structure(25_000),
      attendance: { ...emptyAttendance, presentDays: 0, holidayDays: 0, weekOffDays: 0 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 2, clDays: 1, elDays: 1 },
      bonuses: [],
      reimbursements: [{ amount: 500, category: "travel" }],
    });
    assert.equal(leave.grossSalary, 25_000);
    assert.equal(leave.netSalary, 24_800);
    assert.equal(
      resolveFinalPayableAmount(leave.netSalary, leave.breakdown, leave.totalAllowances),
      25_300,
    );
  });

  it("keeps a completed month on the same full-salary minus actual LOP model", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: new Date("2026-10-02"),
      salaryStructure: structure(25_000),
      attendance: { ...emptyAttendance, presentDays: 20, absentDays: 2, holidayDays: 4, weekOffDays: 0 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 2, clDays: 1, elDays: 1 },
      bonuses: [],
      reimbursements: [],
    });
    assert.equal(result.breakdown.attendance.paidDays, 26);
    assert.equal(result.grossSalary, roundCurrency(25_000 - (25_000 / 30) * 2));
    assert.equal(result.netSalary, roundCurrency(result.grossSalary - 200));
  });
});
