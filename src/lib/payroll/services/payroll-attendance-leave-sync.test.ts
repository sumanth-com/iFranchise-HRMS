import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyPayrollAttendanceDay,
  mergePayrollLeaveSummary,
  tallyAttendanceLeaveMarkers,
} from "@/lib/payroll/services/payroll-attendance-leave-sync";
import {
  calculateEmployeePayroll,
  type AttendanceSummary,
} from "@/lib/payroll/services/payroll-calculator";
import {
  resolveFinalPayableAmount,
  roundCurrency,
  sumPayrollEmployeeRowTotals,
} from "@/lib/payroll/services/payroll-utils";

const closedSeptember2026 = new Date("2026-10-15");

function emptySummary(): AttendanceSummary {
  return {
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    onLeaveDays: 0,
    weekOffDays: 0,
    holidayDays: 0,
    overtimeHours: 0,
    lateDays: 0,
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

/** Om Anil Ramtekkar — September 2026 attendance sheet markers (source of truth). */
function omSeptemberAttendanceRows() {
  const rows: Array<{ attendance_status: string; notes: string }> = [];
  // 19 Present days (excluding CL/EL/H)
  for (let i = 0; i < 19; i += 1) {
    rows.push({ attendance_status: "present", notes: "src:P|excel-import" });
  }
  // 4 Sundays / holidays
  for (let i = 0; i < 4; i += 1) {
    rows.push({ attendance_status: "holiday", notes: "src:H|excel-import" });
  }
  rows.push({ attendance_status: "on_leave", notes: "src:CL|excel-import" });
  rows.push({ attendance_status: "on_leave", notes: "src:EL|excel-import" });
  return rows;
}

describe("payroll attendance ↔ leave sync", () => {
  it("counts Om September CL and EL from attendance notes", () => {
    const markers = tallyAttendanceLeaveMarkers(omSeptemberAttendanceRows());
    assert.equal(markers.clDays, 1);
    assert.equal(markers.elDays, 1);
    assert.equal(markers.lopDays, 0);
  });

  it("does not invent LOP when CL/EL exist on attendance but leave-request breakdown says LOP", () => {
    const leave = mergePayrollLeaveSummary({
      attendanceRows: omSeptemberAttendanceRows(),
      requestSummary: {
        // Conflicting / broken leave-request split — must not override sheet CL/EL.
        lopDays: 2,
        paidLeaveDays: 0,
        clDays: 0,
        elDays: 0,
        sandwichDates: [],
      },
    });
    assert.equal(leave.clDays, 1);
    assert.equal(leave.elDays, 1);
    assert.equal(leave.paidLeaveDays, 2);
    assert.equal(leave.lopDays, 0);
  });

  it("keeps Present / CL / EL / LOP counts aligned with attendance source", () => {
    const summary = emptySummary();
    for (const row of omSeptemberAttendanceRows()) {
      applyPayrollAttendanceDay(summary, row.attendance_status, 0, row.notes);
    }
    const leave = mergePayrollLeaveSummary({
      attendanceRows: omSeptemberAttendanceRows(),
      requestSummary: { lopDays: 0, paidLeaveDays: 0, sandwichDates: [] },
    });

    assert.equal(summary.presentDays, 19);
    assert.equal(summary.holidayDays, 4);
    assert.equal(summary.onLeaveDays, 2);
    assert.equal(summary.absentDays, 0);
    assert.equal(leave.clDays, 1);
    assert.equal(leave.elDays, 1);
    assert.equal(leave.lopDays, 0);
  });

  it("counts src:LOP as LOP without treating it as generic Absent", () => {
    const summary = emptySummary();
    applyPayrollAttendanceDay(summary, "absent", 0, "src:LOP|excel-import");
    applyPayrollAttendanceDay(summary, "absent", 0, "src:A|excel-import");
    const leave = mergePayrollLeaveSummary({
      attendanceRows: [
        { attendance_status: "absent", notes: "src:LOP|excel-import" },
        { attendance_status: "absent", notes: "src:A|excel-import" },
      ],
      requestSummary: { lopDays: 0, paidLeaveDays: 0, sandwichDates: [] },
    });
    assert.equal(summary.absentDays, 1);
    assert.equal(leave.lopDays, 1);
  });

  it("September Om gross = ₹20,833.33 and final payable = ₹20,633.33", () => {
    const summary = emptySummary();
    for (const row of omSeptemberAttendanceRows()) {
      applyPayrollAttendanceDay(summary, row.attendance_status, 0, row.notes);
    }
    const leave = mergePayrollLeaveSummary({
      attendanceRows: omSeptemberAttendanceRows(),
      requestSummary: { lopDays: 2, paidLeaveDays: 0, clDays: 0, elDays: 0 },
    });

    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure(25_000),
      attendance: summary,
      leaveSummary: leave,
      bonuses: [],
      reimbursements: [],
    });

    assert.equal(result.breakdown.attendance.presentDays, 19);
    assert.equal(result.breakdown.attendance.holidayCount, 4);
    assert.equal(result.breakdown.attendance.clDays, 1);
    assert.equal(result.breakdown.attendance.elDays, 1);
    assert.equal(result.breakdown.attendance.lopDays, 0);
    assert.equal(result.breakdown.attendance.paidDays, 25);
    assert.equal(result.grossSalary, 20_833.33);
    assert.equal(result.netSalary, 20_633.33);
    assert.equal(
      resolveFinalPayableAmount(result.netSalary, result.breakdown, result.totalAllowances),
      20_633.33,
    );
  });

  it("dashboard totals equal the sum of employee payroll rows", () => {
    const omSummary = emptySummary();
    for (const row of omSeptemberAttendanceRows()) {
      applyPayrollAttendanceDay(omSummary, row.attendance_status, 0, row.notes);
    }
    const omLeave = mergePayrollLeaveSummary({
      attendanceRows: omSeptemberAttendanceRows(),
      requestSummary: { lopDays: 0, paidLeaveDays: 0 },
    });
    const om = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure(25_000),
      attendance: omSummary,
      leaveSummary: omLeave,
      bonuses: [],
      reimbursements: [],
    });

    const diksha = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: closedSeptember2026,
      salaryStructure: structure(50_000),
      attendance: {
        presentDays: 20,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        weekOffDays: 0,
        holidayDays: 4,
        overtimeHours: 0,
        lateDays: 0,
      },
      leaveSummary: mergePayrollLeaveSummary({
        attendanceRows: [{ attendance_status: "absent", notes: "src:LOP|excel-import" }],
        requestSummary: { lopDays: 0, paidLeaveDays: 0 },
      }),
      bonuses: [],
      reimbursements: [],
    });

    const rows = [om, diksha];
    const totals = sumPayrollEmployeeRowTotals(rows);
    assert.equal(totals.employeeCount, 2);
    assert.equal(
      totals.totalGross,
      roundCurrency(rows.reduce((sum, row) => sum + row.grossSalary, 0)),
    );
    assert.equal(om.grossSalary, 20_833.33);
    assert.equal(diksha.grossSalary, 40_000);
  });
});
