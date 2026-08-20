import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateLeaveDuration,
  classifyCalendarDay,
  DEFAULT_LEAVE_CALENDAR,
  type LeaveCalendarContext,
} from "./leave-calendar-engine";
import {
  DEFAULT_LEAVE_NOTICE,
  getProbationSnapshot,
  validateLeavePolicy,
} from "./leave-policy-engine";

const calendar = (holidays: string[] = []): LeaveCalendarContext => ({
  ...DEFAULT_LEAVE_CALENDAR,
  holidays,
});

function duration(
  startDate: string,
  endDate: string,
  holidays: string[] = [],
  isHalfDay = false,
) {
  return calculateLeaveDuration({
    startDate,
    endDate,
    isHalfDay,
    calendar: calendar(holidays),
  });
}

describe("working calendar", () => {
  it("treats Sunday as a weekly holiday", () => {
    assert.equal(classifyCalendarDay("2026-09-13", calendar()), "weekly_off");
  });

  it("treats 2nd Saturday as a half day", () => {
    assert.equal(classifyCalendarDay("2026-09-12", calendar()), "half_day");
  });

  it("treats 4th Saturday as a half day", () => {
    assert.equal(classifyCalendarDay("2026-09-26", calendar()), "half_day");
  });

  it("treats other Saturdays as full working days", () => {
    assert.equal(classifyCalendarDay("2026-09-05", calendar()), "working");
    assert.equal(classifyCalendarDay("2026-09-19", calendar()), "working");
  });

  it("treats company holidays as holidays even on a working Saturday", () => {
    assert.equal(
      classifyCalendarDay("2026-08-15", calendar(["2026-08-15"])),
      "holiday",
    );
  });
});

describe("sandwich leave", () => {
  it("includes Sunday when Friday leave connects through a 2nd Saturday half day", () => {
    const result = duration("2026-09-11", "2026-09-11");
    assert.equal(result.workingDays, 1);
    assert.equal(result.sandwichDays, 1);
    assert.ok(result.days.some((day) => day.date === "2026-09-13" && day.kind === "sandwich"));
    assert.equal(result.totalLeaveDays, 2);
  });

  it("includes Sunday when Monday leave follows a weekly holiday", () => {
    const result = duration("2026-09-14", "2026-09-14");
    assert.ok(result.days.some((day) => day.date === "2026-09-13" && day.kind === "sandwich"));
    assert.equal(result.totalLeaveDays, 2);
  });

  it("includes Saturday and Sunday for Friday to Monday when Saturday is a half day", () => {
    const result = duration("2026-09-11", "2026-09-14");
    assert.equal(result.workingDays, 2);
    assert.equal(result.halfDays, 1);
    assert.equal(result.sandwichDays, 1);
    assert.equal(result.totalLeaveDays, 3.5);
  });

  it("does not sandwich Sunday across a full working Saturday", () => {
    const result = duration("2026-09-18", "2026-09-18");
    assert.equal(classifyCalendarDay("2026-09-19", calendar()), "working");
    assert.equal(result.sandwichDays, 0);
    assert.equal(result.totalLeaveDays, 1);
  });

  it("treats 4th Saturday leave as a half day and sandwiches the following Sunday", () => {
    const result = duration("2026-09-26", "2026-09-26");
    assert.equal(result.halfDays, 1);
    assert.equal(result.sandwichDays, 1);
    assert.equal(result.totalLeaveDays, 1.5);
  });

  it("counts a working Saturday in range as a full working day and sandwiches the following Sunday", () => {
    const result = duration("2026-09-18", "2026-09-19");
    assert.equal(classifyCalendarDay("2026-09-19", calendar()), "working");
    assert.equal(result.workingDays, 2);
    assert.equal(result.sandwichDays, 1);
    assert.ok(result.days.some((day) => day.date === "2026-09-20" && day.kind === "sandwich"));
    assert.equal(result.totalLeaveDays, 3);
  });

  it("includes Sunday for Friday to Monday even when Saturday is a working day", () => {
    const result = duration("2026-09-18", "2026-09-21");
    assert.equal(result.workingDays, 3);
    assert.equal(result.sandwichDays, 1);
    assert.ok(result.days.some((day) => day.date === "2026-09-20" && day.kind === "sandwich"));
    assert.equal(result.totalLeaveDays, 4);
  });

  it("includes Sunday when Saturday half-day leave is taken before the weekly holiday", () => {
    const result = duration("2026-09-12", "2026-09-13");
    assert.equal(result.halfDays, 1);
    assert.equal(result.sandwichDays, 1);
    assert.equal(result.totalLeaveDays, 1.5);
  });

  it("counts a public holiday under sandwich when connected to leave", () => {
    const result = duration("2026-08-14", "2026-08-14", ["2026-08-15"]);
    assert.ok(result.days.some((day) => day.date === "2026-08-15" && day.kind === "sandwich"));
  });
});

describe("probation and notice", () => {
  const employee = {
    employeeId: "e1",
    joiningDate: "2026-07-01",
    employmentStatus: "probation" as const,
    gender: "female",
    usedAndPendingByType: {} as Record<string, number>,
  };

  it("blocks CL in the first month of probation", () => {
    const issues = validateLeavePolicy({
      asOf: new Date("2026-07-10T10:00:00+05:30"),
      startDate: "2026-07-20",
      endDate: "2026-07-20",
      isHalfDay: false,
      leaveTypeCode: "CL",
      isPaid: true,
      duration: duration("2026-07-20", "2026-07-20"),
      availableBalance: 6,
      employee,
      overlapping: false,
    });
    assert.ok(issues.some((issue) => issue.code === "probation_month_1"));
  });

  it("allows CL in the second month within the 2-day cap", () => {
    const snapshot = getProbationSnapshot(employee, "2026-08-10");
    assert.equal(snapshot.month, 2);
    const issues = validateLeavePolicy({
      asOf: new Date("2026-08-08T10:00:00+05:30"),
      startDate: "2026-08-10",
      endDate: "2026-08-10",
      isHalfDay: false,
      leaveTypeCode: "CL",
      isPaid: true,
      duration: duration("2026-08-10", "2026-08-10"),
      availableBalance: 6,
      employee,
      overlapping: false,
    });
    assert.equal(issues.filter((issue) => issue.code === "probation_month_1").length, 0);
  });

  it("treats the third probation month as month 3 and allows CL within the cap", () => {
    const snapshot = getProbationSnapshot(employee, "2026-09-10");
    assert.equal(snapshot.month, 3);
    assert.equal(snapshot.onProbation, true);
  });

  it("does not keep confirmed employees on probation rules", () => {
    const snapshot = getProbationSnapshot(
      { ...employee, employmentStatus: "active" },
      "2026-07-20",
    );
    assert.equal(snapshot.onProbation, false);
  });

  it("rejects CL with less than 24 hours notice", () => {
    const issues = validateLeavePolicy({
      asOf: new Date("2026-08-10T09:00:00+05:30"),
      startDate: "2026-08-10",
      endDate: "2026-08-10",
      isHalfDay: false,
      leaveTypeCode: "CL",
      isPaid: true,
      duration: duration("2026-08-10", "2026-08-10"),
      availableBalance: 6,
      employee: { ...employee, joiningDate: "2026-01-01", employmentStatus: "active" },
      notice: DEFAULT_LEAVE_NOTICE,
      overlapping: false,
    });
    assert.ok(issues.some((issue) => issue.code === "notice"));
  });

  it("allows CL starting tomorrow", () => {
    const issues = validateLeavePolicy({
      asOf: new Date("2026-08-10T18:00:00+05:30"),
      startDate: "2026-08-11",
      endDate: "2026-08-11",
      isHalfDay: false,
      leaveTypeCode: "CL",
      isPaid: true,
      duration: duration("2026-08-11", "2026-08-11"),
      availableBalance: 6,
      employee: { ...employee, joiningDate: "2026-01-01", employmentStatus: "active" },
      notice: DEFAULT_LEAVE_NOTICE,
      overlapping: false,
    });
    assert.equal(issues.filter((issue) => issue.code === "notice").length, 0);
  });

  it("allows same-day half-day CL", () => {
    const issues = validateLeavePolicy({
      asOf: new Date("2026-08-10T11:00:00+05:30"),
      startDate: "2026-08-10",
      endDate: "2026-08-10",
      isHalfDay: true,
      leaveTypeCode: "CL",
      isPaid: true,
      duration: duration("2026-08-10", "2026-08-10", [], true),
      availableBalance: 6,
      employee: { ...employee, joiningDate: "2026-01-01", employmentStatus: "active" },
      notice: DEFAULT_LEAVE_NOTICE,
      overlapping: false,
    });
    assert.equal(issues.filter((issue) => issue.code === "notice").length, 0);
  });

  it("still rejects same-day full-day CL", () => {
    const issues = validateLeavePolicy({
      asOf: new Date("2026-08-10T11:00:00+05:30"),
      startDate: "2026-08-10",
      endDate: "2026-08-10",
      isHalfDay: false,
      leaveTypeCode: "CL",
      isPaid: true,
      duration: duration("2026-08-10", "2026-08-10"),
      availableBalance: 6,
      employee: { ...employee, joiningDate: "2026-01-01", employmentStatus: "active" },
      notice: DEFAULT_LEAVE_NOTICE,
      overlapping: false,
    });
    assert.ok(issues.some((issue) => issue.code === "notice"));
  });

  it("allows same-day PL before end of working day", () => {
    const issues = validateLeavePolicy({
      asOf: new Date("2026-08-10T16:00:00+05:30"),
      startDate: "2026-08-10",
      endDate: "2026-08-10",
      isHalfDay: false,
      leaveTypeCode: "PL",
      isPaid: true,
      duration: duration("2026-08-10", "2026-08-10"),
      availableBalance: 1,
      employee,
      overlapping: false,
    });
    assert.equal(issues.filter((issue) => issue.code === "notice").length, 0);
    assert.equal(issues.filter((issue) => issue.code === "pl_same_day").length, 0);
  });

  it("rejects requests that exceed available balance", () => {
    const result = duration("2026-08-10", "2026-08-12");
    const issues = validateLeavePolicy({
      asOf: new Date("2026-08-01T10:00:00+05:30"),
      startDate: "2026-08-10",
      endDate: "2026-08-12",
      isHalfDay: false,
      leaveTypeCode: "CL",
      isPaid: true,
      duration: result,
      availableBalance: 0.5,
      employee: { ...employee, joiningDate: "2026-01-01", employmentStatus: "active" },
      overlapping: false,
    });
    assert.ok(issues.some((issue) => issue.code === "balance"));
  });

  it("rejects overlapping leave", () => {
    const issues = validateLeavePolicy({
      asOf: new Date("2026-08-01T10:00:00+05:30"),
      startDate: "2026-08-10",
      endDate: "2026-08-10",
      isHalfDay: false,
      leaveTypeCode: "CL",
      isPaid: true,
      duration: duration("2026-08-10", "2026-08-10"),
      availableBalance: 6,
      employee: { ...employee, joiningDate: "2026-01-01", employmentStatus: "active" },
      overlapping: true,
    });
    assert.ok(issues.some((issue) => issue.code === "overlap"));
  });
});
