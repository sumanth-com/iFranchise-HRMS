import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyOfficialHolidaysToAttendanceSummary,
  shouldPreserveAttendanceOverOfficialHoliday,
} from "@/lib/payroll/services/payroll-attendance-holidays";
import {
  calculateEmployeePayroll,
  computeExcelPaidWorkingDays,
  EXCEL_PAYROLL_DAY_DENOMINATOR,
} from "@/lib/payroll/services/payroll-calculator";
import { resolveFinalPayableAmount, roundCurrency } from "@/lib/payroll/services/payroll-utils";
import { DEFAULT_LEAVE_CALENDAR } from "@/lib/leave/services/leave-calendar-engine";

function emptySummary() {
  return {
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    onLeaveDays: 0,
    weekOffDays: 0,
    holidayDays: 0,
  };
}

function structure(gross: number) {
  const basic = roundCurrency(gross * 0.5);
  const hra = roundCurrency(gross * 0.25);
  const lta = roundCurrency(gross * 0.1);
  const special = roundCurrency(gross - basic - hra - lta);
  return {
    id: "struct",
    employee_id: "emp",
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
    },
  };
}

describe("official holiday attendance facts", () => {
  it("credits missing official holidays as H without converting weekly offs", () => {
    const summary = {
      ...emptySummary(),
      presentDays: 9,
      weekOffDays: 4,
      holidayDays: 0,
    };
    const statusByDate = new Map<string, string>([
      ["2026-09-06", "week_off"],
      ["2026-09-13", "week_off"],
      ["2026-09-20", "week_off"],
      ["2026-09-27", "week_off"],
    ]);

    applyOfficialHolidaysToAttendanceSummary(summary, {
      officialHolidayDates: ["2026-09-14"],
      statusByDate,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    });

    assert.equal(summary.holidayDays, 1);
    assert.equal(summary.weekOffDays, 4);
    assert.equal(
      computeExcelPaidWorkingDays(
        { ...summary, overtimeHours: 0, lateDays: 0 },
        { lopDays: 0, paidLeaveDays: 0 },
      ),
      10,
    );
  });

  it("reclassifies week_off on an official holiday date to H", () => {
    const summary = {
      ...emptySummary(),
      weekOffDays: 1,
      holidayDays: 0,
    };
    applyOfficialHolidaysToAttendanceSummary(summary, {
      officialHolidayDates: ["2026-09-14"],
      statusByDate: new Map([["2026-09-14", "week_off"]]),
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    });
    assert.equal(summary.holidayDays, 1);
    assert.equal(summary.weekOffDays, 0);
  });

  it("does not invent Saturday/Sunday holidays outside the official list", () => {
    const summary = {
      ...emptySummary(),
      presentDays: 9,
      weekOffDays: 1,
    };
    applyOfficialHolidaysToAttendanceSummary(summary, {
      officialHolidayDates: [],
      statusByDate: new Map([
        ["2026-09-05", "present"],
        ["2026-09-06", "week_off"],
      ]),
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    });
    assert.equal(summary.holidayDays, 0);
    assert.equal(summary.weekOffDays, 1);
  });

  it("does not double-count when attendance is already holiday or present", () => {
    const summary = {
      ...emptySummary(),
      presentDays: 1,
      holidayDays: 1,
    };
    applyOfficialHolidaysToAttendanceSummary(summary, {
      officialHolidayDates: ["2026-09-14", "2026-10-02"],
      statusByDate: new Map([
        ["2026-09-14", "holiday"],
        ["2026-10-02", "present"],
      ]),
      periodStart: "2026-09-01",
      periodEnd: "2026-10-31",
    });
    assert.equal(summary.holidayDays, 1);
    assert.equal(summary.presentDays, 1);
  });

  it("respects joining date — holidays before join are ignored", () => {
    const summary = emptySummary();
    applyOfficialHolidaysToAttendanceSummary(summary, {
      officialHolidayDates: ["2026-09-14"],
      statusByDate: new Map(),
      periodStart: "2026-09-20",
      periodEnd: "2026-09-30",
    });
    assert.equal(summary.holidayDays, 0);
  });

  it("excludes LOP/Absent from paid days while keeping official H + CL/EL", () => {
    const attendance = {
      presentDays: 8,
      absentDays: 1,
      halfDays: 0,
      onLeaveDays: 0,
      weekOffDays: 4,
      holidayDays: 1,
      overtimeHours: 0,
      lateDays: 0,
    };
    assert.equal(
      computeExcelPaidWorkingDays(attendance, { lopDays: 1, paidLeaveDays: 1 }),
      10,
    );
  });

  it("keeps /30, PT, single reimbursement, and final payout with official H", () => {
    const attendance = {
      presentDays: 9,
      absentDays: 0,
      halfDays: 0,
      onLeaveDays: 0,
      weekOffDays: 4,
      holidayDays: 1,
      overtimeHours: 0,
      lateDays: 0,
    };
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: new Date("2026-09-10"),
      calendar: DEFAULT_LEAVE_CALENDAR,
      salaryStructure: structure(25_000),
      attendance,
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [{ amount: 600, category: "travel" }],
    });
    assert.equal(EXCEL_PAYROLL_DAY_DENOMINATOR, 30);
    assert.equal(result.breakdown.attendance.paidDays, 10);
    assert.equal(result.breakdown.attendance.dailyRate, roundCurrency(25_000 / 30));
    assert.equal(result.grossSalary, roundCurrency((25_000 / 30) * 10));
    assert.equal(
      result.breakdown.deductions.find((d) => d.code === "pt")?.amount,
      200,
    );
    const reimbLines = result.breakdown.earnings.filter((e) =>
      e.code.includes("reimbursement"),
    );
    assert.equal(reimbLines.length, 1);
    assert.equal(reimbLines[0]?.amount, 600);
    const finalPayable = resolveFinalPayableAmount(
      result.netSalary,
      result.breakdown,
      result.totalAllowances,
    );
    assert.equal(
      finalPayable,
      roundCurrency(result.netSalary + 600),
    );
  });

  it("shouldPreserveAttendanceOverOfficialHoliday protects worked/leave days", () => {
    assert.equal(shouldPreserveAttendanceOverOfficialHoliday("present"), true);
    assert.equal(shouldPreserveAttendanceOverOfficialHoliday("week_off"), false);
    assert.equal(shouldPreserveAttendanceOverOfficialHoliday(null), false);
  });
});
