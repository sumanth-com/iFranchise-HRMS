import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSalaryStructureSegments,
  calculateEmployeePayroll,
  excelPayrollDayDenominator,
  type SalaryStructureRow,
} from "@/lib/payroll/services/payroll-calculator";
import { roundCurrency } from "@/lib/payroll/services/payroll-utils";

const closedOctober2026 = new Date("2026-11-05");
const octoberDays = excelPayrollDayDenominator(10, 2026);

function structure(
  id: string,
  gross: number,
  effectiveFrom: string,
  effectiveTo: string | null = null,
): SalaryStructureRow {
  const basic = roundCurrency(gross * 0.5);
  const hra = roundCurrency(gross * 0.25);
  const lta = roundCurrency(gross * 0.1);
  const special = roundCurrency(gross - basic - hra - lta);
  return {
    id,
    employee_id: "emp",
    basic_salary: basic,
    hra_amount: hra,
    transport_allowance: lta,
    other_allowances: 0,
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
    },
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  };
}

const emptyAttendance = {
  presentDays: 30,
  absentDays: 0,
  halfDays: 0,
  onLeaveDays: 0,
  weekOffDays: 4,
  holidayDays: 1,
  overtimeHours: 0,
  lateDays: 0,
};

describe("mid-month salary structure segments", () => {
  it("splits October at the full-time effective date using calendar-day daily rates", () => {
    const probation = structure("prob", 12_000, "2026-07-01", "2026-10-13");
    const fullTime = structure("ft", 50_000, "2026-10-14", null);

    const segments = buildSalaryStructureSegments(
      [probation, fullTime],
      "2026-10-01",
      "2026-10-31",
    );

    assert.equal(segments.length, 2);
    assert.equal(segments[0]!.startDate, "2026-10-01");
    assert.equal(segments[0]!.endDate, "2026-10-13");
    assert.equal(segments[0]!.calendarDays, 13);
    assert.equal(segments[0]!.dailyRate, roundCurrency(12_000 / octoberDays));
    assert.equal(
      segments[0]!.segmentGross,
      roundCurrency((12_000 / octoberDays) * 13),
    );

    assert.equal(segments[1]!.startDate, "2026-10-14");
    assert.equal(segments[1]!.endDate, "2026-10-31");
    assert.equal(segments[1]!.calendarDays, 18);
    assert.equal(segments[1]!.dailyRate, roundCurrency(50_000 / octoberDays));
    assert.equal(
      segments[1]!.segmentGross,
      roundCurrency((50_000 / octoberDays) * 18),
    );
  });

  it("calculates blended payable from paid days in each salary period", () => {
    const probation = structure("prob", 12_000, "2026-07-01", "2026-10-13");
    const fullTime = structure("ft", 50_000, "2026-10-14", null);
    const expected =
      roundCurrency((12_000 / octoberDays) * 13) +
      roundCurrency((50_000 / octoberDays) * 18);

    const result = calculateEmployeePayroll({
      month: 10,
      year: 2026,
      asOfDate: closedOctober2026,
      salaryStructure: fullTime,
      salaryStructures: [probation, fullTime],
      attendance: emptyAttendance,
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });

    assert.equal(result.grossSalary, expected);
    assert.ok(result.breakdown.salarySegments);
    assert.equal(result.breakdown.salarySegments?.length, 2);
    assert.notEqual(result.breakdown.attendance.monthlyGrossSalary, 12_000);
    assert.notEqual(result.breakdown.attendance.monthlyGrossSalary, 50_000);
    assert.ok(
      (result.breakdown.notes ?? []).some((note) =>
        note.toLowerCase().includes("mid-month salary revision"),
      ),
    );
  });

  it("keeps a single structure on salary ÷ calendar days × paid days", () => {
    const only = structure("only", 50_000, "2026-01-01", null);
    const result = calculateEmployeePayroll({
      month: 10,
      year: 2026,
      asOfDate: closedOctober2026,
      salaryStructure: only,
      salaryStructures: [only],
      attendance: emptyAttendance,
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });

    assert.equal(result.grossSalary, 50_000);
    assert.equal(result.breakdown.salarySegments, undefined);
  });

  it("pays Sumanth's October confirmation using 1–13 at ₹12,000 and 14 onward at ₹50,000", () => {
    const probation = structure("prob", 12_000, "2026-04-13", "2026-10-13");
    const fullTime = structure("ft", 50_000, "2026-10-14", null);
    const unpaid = new Set(["2026-10-22", "2026-10-23"]);
    const paidDates = Array.from({ length: 31 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return `2026-10-${day}`;
    }).filter((date) => !unpaid.has(date));
    const period1 = roundCurrency((12_000 / octoberDays) * 13);
    const period2 = roundCurrency((50_000 / octoberDays) * 16);
    const expected = roundCurrency(period1 + period2);

    const result = calculateEmployeePayroll({
      month: 10,
      year: 2026,
      asOfDate: closedOctober2026,
      salaryStructure: fullTime,
      salaryStructures: [probation, fullTime],
      attendance: {
        presentDays: 22,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 1,
        weekOffDays: 0,
        holidayDays: 6,
        overtimeHours: 0,
        lateDays: 0,
        paidDates,
      },
      leaveSummary: { lopDays: 2, paidLeaveDays: 1, clDays: 1, elDays: 0 },
      bonuses: [],
      reimbursements: [],
    });

    assert.equal(period1, 5_032.26);
    assert.equal(period2, 25_806.45);
    assert.equal(expected, 30_838.71);
    assert.equal(result.breakdown.attendance.paidDays, 29);
    assert.equal(result.breakdown.attendance.lopDays, 2);
    assert.equal(result.grossSalary, 30_838.71);
    assert.equal(result.totalDeductions, 0);
    assert.equal(result.netSalary, 30_838.71);
    assert.equal(result.breakdown.salarySegments?.[0]?.paidDays, 13);
    assert.equal(result.breakdown.salarySegments?.[0]?.payableGross, 5_032.26);
    assert.equal(result.breakdown.salarySegments?.[1]?.paidDays, 16);
    assert.equal(result.breakdown.salarySegments?.[1]?.payableGross, 25_806.45);
  });
});
