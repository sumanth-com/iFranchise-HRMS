import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSalaryStructureSegments,
  calculateEmployeePayroll,
  EXCEL_PAYROLL_DAY_DENOMINATOR,
  type SalaryStructureRow,
} from "@/lib/payroll/services/payroll-calculator";
import { roundCurrency } from "@/lib/payroll/services/payroll-utils";

const closedOctober2026 = new Date("2026-11-05");

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
  presentDays: 31,
  absentDays: 0,
  halfDays: 0,
  onLeaveDays: 0,
  weekOffDays: 4,
  holidayDays: 1,
  overtimeHours: 0,
  lateDays: 0,
};

describe("mid-month salary structure segments", () => {
  it("splits October at the full-time effective date using ÷30 daily rates", () => {
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
    assert.equal(segments[0]!.dailyRate, roundCurrency(12_000 / EXCEL_PAYROLL_DAY_DENOMINATOR));
    assert.equal(
      segments[0]!.segmentGross,
      roundCurrency((12_000 / EXCEL_PAYROLL_DAY_DENOMINATOR) * 13),
    );

    assert.equal(segments[1]!.startDate, "2026-10-14");
    assert.equal(segments[1]!.endDate, "2026-10-31");
    assert.equal(segments[1]!.calendarDays, 18);
    assert.equal(segments[1]!.dailyRate, roundCurrency(50_000 / EXCEL_PAYROLL_DAY_DENOMINATOR));
    assert.equal(
      segments[1]!.segmentGross,
      roundCurrency((50_000 / EXCEL_PAYROLL_DAY_DENOMINATOR) * 18),
    );
  });

  it("calculates blended gross for mid-month confirmation without rewriting a single monthly amount", () => {
    const probation = structure("prob", 12_000, "2026-07-01", "2026-10-13");
    const fullTime = structure("ft", 50_000, "2026-10-14", null);
    const expected =
      roundCurrency((12_000 / 30) * 13) + roundCurrency((50_000 / 30) * 18);

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
    assert.ok(
      (result.breakdown.notes ?? []).some((note) =>
        note.toLowerCase().includes("mid-month salary change"),
      ),
    );
  });

  it("keeps full monthly salary when only one structure covers the month", () => {
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

  it("applies LOP against the blended daily rate for mid-month splits", () => {
    const probation = structure("prob", 12_000, "2026-07-01", "2026-10-13");
    const fullTime = structure("ft", 50_000, "2026-10-14", null);
    const blended =
      roundCurrency((12_000 / 30) * 13) + roundCurrency((50_000 / 30) * 18);
    const result = calculateEmployeePayroll({
      month: 10,
      year: 2026,
      asOfDate: closedOctober2026,
      salaryStructure: fullTime,
      salaryStructures: [probation, fullTime],
      attendance: { ...emptyAttendance, absentDays: 1, presentDays: 30 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });

    const avgDaily = blended / 31;
    const expected = roundCurrency(Math.max(0, blended - avgDaily * 1));
    assert.equal(result.grossSalary, expected);
  });
});
