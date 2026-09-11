import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyOfficialHolidaysToAttendanceSummary,
  applySundayHolidaysToAttendanceSummary,
  listSundaysInRange,
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

  it("does not double-count when an official holiday falls on a Sunday", () => {
    const summary = emptySummary();
    const statusByDate = new Map<string, string | null | undefined>();
    applyOfficialHolidaysToAttendanceSummary(summary, {
      officialHolidayDates: ["2026-09-06"],
      statusByDate,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    });
    applySundayHolidaysToAttendanceSummary(summary, {
      statusByDate,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    });
    // Sep 6 once + Sep 13, 20, 27 = 4
    assert.equal(summary.holidayDays, 4);
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

  it("credits Sundays as Holiday (H) within the as-of window without hardcoding dates", () => {
    assert.deepEqual(listSundaysInRange("2026-09-01", "2026-09-30"), [
      "2026-09-06",
      "2026-09-13",
      "2026-09-20",
      "2026-09-27",
    ]);
    assert.deepEqual(listSundaysInRange("2026-09-01", "2026-09-11"), ["2026-09-06"]);
    assert.deepEqual(listSundaysInRange("2026-10-01", "2026-10-31"), [
      "2026-10-04",
      "2026-10-11",
      "2026-10-18",
      "2026-10-25",
    ]);

    const summary = {
      ...emptySummary(),
      presentDays: 9,
      weekOffDays: 1,
    };
    applySundayHolidaysToAttendanceSummary(summary, {
      statusByDate: new Map([["2026-09-06", "week_off"]]),
      periodStart: "2026-09-01",
      periodEnd: "2026-09-11",
    });
    assert.equal(summary.weekOffDays, 0);
    assert.equal(summary.holidayDays, 1);
    assert.equal(
      computeExcelPaidWorkingDays(
        { ...summary, overtimeHours: 0, lateDays: 0 },
        { lopDays: 0, paidLeaveDays: 0 },
      ),
      10,
    );
  });

  it("does not credit future Sundays beyond as-of, and never double-counts holiday rows", () => {
    const summary = {
      ...emptySummary(),
      presentDays: 9,
      holidayDays: 1,
    };
    const statusByDate = new Map([["2026-09-06", "holiday"]]);
    applySundayHolidaysToAttendanceSummary(summary, {
      statusByDate,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-11",
    });
    assert.equal(summary.holidayDays, 1);

    applySundayHolidaysToAttendanceSummary(summary, {
      statusByDate,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    });
    // Sep 6 already holiday; +3 remaining Sundays in September
    assert.equal(summary.holidayDays, 4);
  });

  it("matches Excel Om when 9P + 4 Sundays are in range: 25000/30*13 - 200", () => {
    const summary = {
      ...emptySummary(),
      presentDays: 9,
    };
    applySundayHolidaysToAttendanceSummary(summary, {
      statusByDate: new Map(),
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    });
    assert.equal(summary.holidayDays, 4);
    assert.equal(
      computeExcelPaidWorkingDays(
        { ...summary, overtimeHours: 0, lateDays: 0 },
        { lopDays: 0, paidLeaveDays: 0 },
      ),
      13,
    );

    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: new Date("2026-09-30"),
      calendar: DEFAULT_LEAVE_CALENDAR,
      salaryStructure: structure(25_000),
      attendance: { ...summary, overtimeHours: 0, lateDays: 0 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
    });
    assert.equal(result.grossSalary, 10_833.33);
    assert.equal(result.totalDeductions, 200);
    assert.equal(result.netSalary, 10_633.33);
    assert.equal(
      resolveFinalPayableAmount(result.netSalary, result.breakdown, result.totalAllowances),
      10_633.33,
    );
    assert.equal(EXCEL_PAYROLL_DAY_DENOMINATOR, 30);
  });

  it("does not credit official holidays after the as-of period end", () => {
    const summary = {
      ...emptySummary(),
      presentDays: 9,
      holidayDays: 1,
    };
    applyOfficialHolidaysToAttendanceSummary(summary, {
      officialHolidayDates: ["2026-09-14"],
      statusByDate: new Map([["2026-09-06", "holiday"]]),
      periodStart: "2026-09-01",
      periodEnd: "2026-09-11",
    });
    assert.equal(summary.holidayDays, 1);
    assert.equal(
      computeExcelPaidWorkingDays(
        { ...summary, overtimeHours: 0, lateDays: 0 },
        { lopDays: 0, paidLeaveDays: 0 },
      ),
      10,
    );
  });

  it("respects joining date — Sundays before join are ignored", () => {
    const summary = emptySummary();
    applySundayHolidaysToAttendanceSummary(summary, {
      statusByDate: new Map(),
      periodStart: "2026-09-10",
      periodEnd: "2026-09-30",
    });
    // Sep 13, 20, 27 only (Sep 6 before join)
    assert.equal(summary.holidayDays, 3);
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
