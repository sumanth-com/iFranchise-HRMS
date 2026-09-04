import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateLeaveDuration,
  DEFAULT_LEAVE_CALENDAR,
  extraSandwichLopDays,
  sandwichWeeklyOffDates,
  type LeaveCalendarContext,
} from "@/lib/leave/services/leave-calendar-engine";
import {
  splitLeaveDaysByBalance,
} from "@/lib/leave/services/leave-policy-engine";
import { monthlyGrossPerDay } from "@/lib/payroll/salary-structure-period";
import { calculateEmployeePayroll } from "@/lib/payroll/services/payroll-calculator";

const closedSeptember2026 = new Date("2026-10-15");

const september = {
  holidays: [] as string[],
  weekendRules: DEFAULT_LEAVE_CALENDAR.weekendRules,
  sandwich: DEFAULT_LEAVE_CALENDAR.sandwich,
} satisfies LeaveCalendarContext;

const structure = {
  id: "struct",
  employee_id: "emp",
  basic_salary: 15_000,
  hra_amount: 7_500,
  transport_allowance: 3_000,
  other_allowances: 4_500,
  tax_deduction: 0,
  other_deductions: 0,
  gross_salary: 30_000,
  net_salary: 30_000,
  components: {},
};

const presentMonth = {
  presentDays: 26,
  absentDays: 0,
  halfDays: 0,
  onLeaveDays: 0,
  weekOffDays: 4,
  holidayDays: 0,
  overtimeHours: 0,
  lateDays: 0,
};

describe("attendance → leave → LOP → salary structure → payroll", () => {
  it("does not deduct salary for approved paid leave", () => {
    const leave = calculateLeaveDuration({
      startDate: "2026-09-16",
      endDate: "2026-09-16",
      isHalfDay: false,
      calendar: september,
    });
    const split = splitLeaveDaysByBalance({
      totalDays: leave.totalLeaveDays,
      availableBalance: 2,
      isPaid: true,
    });
    assert.equal(split.paidDays, 1);
    assert.equal(split.lopDays, 0);

    const payroll = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure,
      attendance: { ...presentMonth, onLeaveDays: 1 },
      leaveSummary: { lopDays: 0, paidLeaveDays: split.paidDays },
      bonuses: [],
      reimbursements: [],
    });
    assert.equal(payroll.breakdown.deductions.some((line) => line.code === "lop"), false);
    assert.equal(payroll.grossSalary, 27_000);
    assert.equal(payroll.netSalary, 27_000);
  });

  it("deducts LOP using salary-structure per-day (monthly gross ÷ calendar days)", () => {
    const perDay = monthlyGrossPerDay(30_000, 30);
    assert.equal(perDay, 1_000);

    const payroll = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure,
      attendance: presentMonth,
      leaveSummary: { lopDays: 2, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
      settings: { workingDaysCalculation: "calendar_days", lossOfPayDeduction: true },
    });
    const lop = payroll.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(lop?.amount, 2_000);
    assert.equal(payroll.grossSalary, 26_000);
    assert.equal(payroll.netSalary, 26_000);
  });

  it("deducts exactly half the per-day amount for half-day LOP", () => {
    const leave = calculateLeaveDuration({
      startDate: "2026-09-16",
      endDate: "2026-09-16",
      isHalfDay: true,
      calendar: september,
    });
    const split = splitLeaveDaysByBalance({
      totalDays: leave.totalLeaveDays,
      availableBalance: 0,
      isPaid: true,
    });
    assert.equal(split.lopDays, 0.5);

    const payroll = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure,
      attendance: presentMonth,
      leaveSummary: { lopDays: split.lopDays, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
      settings: { workingDaysCalculation: "calendar_days", lossOfPayDeduction: true },
    });
    const lop = payroll.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(lop?.amount, 500);
  });

  it("creates 0.5 LOP from three late entries", () => {
    const payroll = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure,
      attendance: { ...presentMonth, lateDays: 3 },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
      settings: { workingDaysCalculation: "calendar_days", lossOfPayDeduction: true },
    });
    const lop = payroll.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(payroll.breakdown.attendance.lopDays, 0.5);
    assert.equal(lop?.amount, 500);
  });

  it("sandwiches Sunday inside a continuous Sat–Mon absence and never holidays", () => {
    const sunday = sandwichWeeklyOffDates(["2026-09-19", "2026-09-21"], september);
    assert.equal(sunday.has("2026-09-20"), true);

    const withHoliday = sandwichWeeklyOffDates(["2026-09-11", "2026-09-14"], {
      ...september,
      holidays: ["2026-09-12"],
    });
    assert.equal(withHoliday.has("2026-09-13"), true);
    assert.equal(withHoliday.has("2026-09-12"), false);

    const payroll = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure,
      attendance: {
        ...presentMonth,
        absentDays: 2,
        sandwichLopDays: extraSandwichLopDays(["2026-09-19", "2026-09-21"], [], september),
      },
      leaveSummary: { lopDays: 0, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
      settings: { workingDaysCalculation: "calendar_days", lossOfPayDeduction: true },
    });
    const lop = payroll.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(payroll.breakdown.attendance.lopDays, 3);
    assert.equal(lop?.amount, 3_000);
    assert.equal(payroll.grossSalary, 26_000);
  });

  it("does not double-count sandwich days already included in leave LOP", () => {
    const extra = extraSandwichLopDays(
      ["2026-09-19", "2026-09-21"],
      ["2026-09-20"],
      september,
    );
    assert.equal(extra, 0);
  });

  it("matches historical XLSX-style gross when per-day is monthly gross ÷ 30", () => {
    assert.equal(monthlyGrossPerDay(13_500, 30), 450);
    const payroll = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: {
        ...structure,
        basic_salary: 6_750,
        hra_amount: 3_375,
        transport_allowance: 1_350,
        other_allowances: 2_025,
        gross_salary: 13_500,
        net_salary: 13_500,
      },
      attendance: presentMonth,
      leaveSummary: { lopDays: 1, paidLeaveDays: 0 },
      bonuses: [],
      reimbursements: [],
      settings: { workingDaysCalculation: "calendar_days", lossOfPayDeduction: true },
    });
    const lop = payroll.breakdown.deductions.find((line) => line.code === "lop");
    assert.equal(lop?.amount, 450);
    assert.equal(payroll.grossSalary, 11_700);
  });
});
