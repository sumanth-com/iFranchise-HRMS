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
    assert.equal(result.grossSalary, roundCurrency((25_000 / 30) * 25));
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
    assert.equal(result.grossSalary, roundCurrency((25_000 / 30) * 25));
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
    assert.equal(result.grossSalary, 40_000);
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

  it("matches Sept-2026 Excel Om: 19+4+1+1=25 → ₹20,833.33 − PT ₹200", () => {
    const result = septRow({
      salary: 25_000,
      present: 19,
      holiday: 4,
      cl: 1,
      el: 1,
    });
    assert.equal(result.breakdown.attendance.paidDays, 25);
    assert.equal(result.grossSalary, 20_833.33);
    assert.equal(result.netSalary, 20_633.33);
  });

  it("matches Sept-2026 Excel Himani: 21+4=25 → ₹20,833.33 − PT ₹200", () => {
    const result = septRow({ salary: 25_000, present: 21, holiday: 4 });
    assert.equal(result.grossSalary, 20_833.33);
    assert.equal(result.netSalary, 20_633.33);
  });

  it("matches Sept-2026 Excel Akshita: 21+4=25 → ₹5,833.33 (no PT)", () => {
    const result = septRow({ salary: 7_000, present: 21, holiday: 4 });
    assert.equal(result.grossSalary, 5_833.33);
    assert.equal(result.netSalary, 5_833.33);
  });

  it("matches Sept-2026 Excel Ekta: 18+5+2=25 → ₹20,833.33 − PT ₹200", () => {
    const result = septRow({ salary: 25_000, present: 18, holiday: 5, cl: 2 });
    assert.equal(result.breakdown.attendance.paidDays, 25);
    assert.equal(result.grossSalary, 20_833.33);
    assert.equal(result.netSalary, 20_633.33);
  });

  it("matches Sept-2026 Excel Diksha: 20+4=24 (LOP excluded) → ₹40,000 − PT ₹200", () => {
    const result = septRow({ salary: 50_000, present: 20, holiday: 4, lop: 1 });
    assert.equal(result.breakdown.attendance.paidDays, 24);
    assert.equal(result.grossSalary, 40_000);
    assert.equal(result.netSalary, 39_800);
  });

  it("matches Sept-2026 Excel Swetha: 21+4=25 → ₹41,666.67 − PT ₹200", () => {
    const result = septRow({ salary: 50_000, present: 21, holiday: 4 });
    assert.equal(result.grossSalary, 41_666.67);
    assert.equal(result.netSalary, 41_466.67);
  });

  it("matches Sept-2026 Excel Sumanth: 21+4=25 → ₹10,000 (no PT)", () => {
    const result = septRow({ salary: 12_000, present: 21, holiday: 4 });
    assert.equal(result.grossSalary, 10_000);
    assert.equal(result.netSalary, 10_000);
  });

  it("matches Sept-2026 Excel Sneha / Prajjwal / Syed / Hemavathi: ₹8,333.33", () => {
    for (const row of [
      { present: 20, holiday: 4, cl: 1 },
      { present: 21, holiday: 4 },
      { present: 21, holiday: 4 },
      { present: 21, holiday: 4 },
    ]) {
      const result = septRow({ salary: 10_000, ...row });
      assert.equal(result.grossSalary, 8_333.33);
      assert.equal(result.netSalary, 8_333.33);
    }
  });

  it("matches Sept-2026 Excel Vivek: 20+4+1=25 → ₹45,138.89 − PT ₹200", () => {
    const result = septRow({
      salary: 54_166.67,
      present: 20,
      holiday: 4,
      cl: 1,
    });
    assert.equal(result.grossSalary, 45_138.89);
    assert.equal(result.netSalary, 44_938.89);
  });

  it("matches Sept-2026 Excel Shakshay / Shiwali: 21+4=25 → ₹41,666.67 − PT ₹200", () => {
    for (const _ of [0, 1]) {
      const result = septRow({ salary: 50_000, present: 21, holiday: 4 });
      assert.equal(result.grossSalary, 41_666.67);
      assert.equal(result.netSalary, 41_466.67);
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
    assert.equal(result.grossSalary, 10_000);
    assert.equal(result.netSalary, 10_000);
    const finalPayable = resolveFinalPayableAmount(
      result.netSalary,
      result.breakdown,
      result.totalAllowances,
    );
    assert.equal(finalPayable, 10_600);
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
    assert.equal(rows[0]?.grossSalary, 20_833.33);
    assert.equal(rows[1]?.grossSalary, 40_000);
    assert.equal(rows[2]?.grossSalary, 5_833.33);
    assert.equal(rows[3]?.grossSalary, 12_000);
    assert.equal(
      totals.totalGross,
      roundCurrency(20_833.33 + 40_000 + 5_833.33 + 12_000),
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

  it("does not invent a monthly-minus-LOP formula when paid days < 30", () => {
    const result = septRow({
      salary: 25_000,
      present: 19,
      holiday: 4,
      cl: 1,
      el: 1,
    });
    assert.notEqual(result.grossSalary, 25_000);
    assert.equal(result.grossSalary, roundCurrency((25_000 / 30) * 25));
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
    assert.equal(result.grossSalary, 22_000);
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
});
