import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildTeamLeaveBalanceRows } from "./leave-team-balances-matrix";
import {
  buildMonthScopedLeaveUsageEntries,
  mergeMonthScopedLeaveUsageEntries,
  sumUsageEntryDays,
  usageEntriesFromAttendanceLeaveDays,
} from "./leave-team-balances-usage";
import { lopDaysFromLeaveRequest } from "./leave-usage";

describe("lopDaysFromLeaveRequest", () => {
  it("reads lopDays from duration_breakdown", () => {
    assert.equal(
      lopDaysFromLeaveRequest({
        total_days: 3,
        duration_breakdown: { paidDays: 1, lopDays: 2 },
      }),
      2,
    );
  });

  it("treats LOP leave type as fully unpaid", () => {
    assert.equal(
      lopDaysFromLeaveRequest({
        total_days: 1.5,
        leaveTypeCode: "LOP",
      }),
      1.5,
    );
  });
});

describe("buildTeamLeaveBalanceRows", () => {
  it("pivots CL/EL/OH ledger rows and applies month-scoped used overrides", () => {
    const rows = buildTeamLeaveBalanceRows({
      employees: [
        {
          id: "e1",
          employeeCode: "IF1",
          employeeName: "Ada Lovelace",
          departmentName: "Technology",
          employmentTypeName: "Full Time",
        },
      ],
      balances: [
        {
          employeeId: "e1",
          leaveTypeCode: "CL",
          balanceDays: 2,
          usedDays: 6,
          pendingDays: 0.5,
        },
        {
          employeeId: "e1",
          leaveTypeCode: "EL",
          balanceDays: 6,
          usedDays: 3,
          pendingDays: 0,
        },
        {
          employeeId: "e1",
          leaveTypeCode: "OH",
          balanceDays: 1,
          usedDays: 1,
          pendingDays: 0,
          allocatedDays: 2,
        },
      ],
      lopByEmployeeId: new Map([["e1", 1]]),
      monthUsedByEmployeeId: new Map([
        ["e1", { cl: 2, el: 0, oh: 0, lop: 0 }],
      ]),
      ohByEmployeeId: new Map([["e1", { allowed: 2, used: 1, remaining: 1 }]]),
      usageByEmployeeId: new Map([
        [
          "e1",
          {
            clUsage: [
              {
                startDate: "2026-09-12",
                endDate: "2026-09-12",
                leaveTypeName: "Casual Leave",
                leaveTypeCode: "CL",
                days: 1,
                status: "Approved",
                reason: null,
                holidayName: null,
              },
              {
                startDate: "2026-09-24",
                endDate: "2026-09-24",
                leaveTypeName: "Casual Leave",
                leaveTypeCode: "CL",
                days: 1,
                status: "Approved",
                reason: null,
                holidayName: null,
              },
            ],
            elUsage: [],
            ohUsage: [],
            lopUsage: [],
          },
        ],
      ]),
    });

    assert.equal(rows[0]!.clAvailable, 2);
    assert.equal(rows[0]!.clUsed, 2);
    assert.equal(rows[0]!.clYearUsed, 6);
    assert.equal(rows[0]!.elUsed, 0);
    assert.equal(rows[0]!.elYearUsed, 3);
    assert.equal(rows[0]!.ohUsed, 0);
    assert.equal(rows[0]!.ohAllowed, 2);
    assert.equal(rows[0]!.ohAvailable, 1);
    assert.equal(rows[0]!.clUsage.length, 2);
    assert.equal(rows[0]!.lopDays, 0);
    assert.deepEqual(rows[0]!.lopUsage, []);
  });
});

describe("buildMonthScopedLeaveUsageEntries", () => {
  const september = { start: "2026-09-01", end: "2026-09-30" };

  it("keeps only September CL dates from day allocations", () => {
    const entries = buildMonthScopedLeaveUsageEntries({
      startDate: "2026-08-30",
      endDate: "2026-09-24",
      leaveTypeCode: "CL",
      leaveTypeName: "Casual Leave",
      status: "approved",
      reason: null,
      totalDays: 3,
      durationBreakdown: {
        dayAllocations: [
          { date: "2026-08-30", kind: "paid", counted: 1 },
          { date: "2026-09-12", kind: "paid", counted: 1 },
          { date: "2026-09-24", kind: "paid", counted: 1 },
          { date: "2026-10-01", kind: "paid", counted: 1 },
        ],
      },
      monthRange: september,
    });

    assert.deepEqual(
      entries.map((entry) => entry.startDate),
      ["2026-09-12", "2026-09-24"],
    );
    assert.equal(
      entries.reduce((sum, entry) => sum + entry.days, 0),
      2,
    );
  });

  it("includes sandwich weekly-off days that consume the leave type", () => {
    const entries = buildMonthScopedLeaveUsageEntries({
      startDate: "2026-09-26",
      endDate: "2026-09-26",
      leaveTypeCode: "CL",
      leaveTypeName: "Casual Leave",
      status: "approved",
      reason: null,
      totalDays: 2,
      durationBreakdown: {
        dayAllocations: [
          { date: "2026-09-26", kind: "paid", counted: 1 },
          { date: "2026-09-27", kind: "sandwich", counted: 1 },
        ],
      },
      monthRange: september,
    });

    assert.equal(entries.length, 2);
    assert.equal(entries[1]!.startDate, "2026-09-27");
    assert.equal(entries[1]!.days, 1);
  });

  it("excludes LOP allocation days from CL usage", () => {
    const entries = buildMonthScopedLeaveUsageEntries({
      startDate: "2026-09-19",
      endDate: "2026-09-21",
      leaveTypeCode: "CL",
      leaveTypeName: "Casual Leave",
      status: "approved",
      reason: null,
      totalDays: 3,
      durationBreakdown: {
        dayAllocations: [
          { date: "2026-09-19", kind: "paid", counted: 1 },
          { date: "2026-09-20", kind: "lop", counted: 1 },
          { date: "2026-09-21", kind: "lop", counted: 1 },
        ],
      },
      monthRange: september,
    });

    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.startDate, "2026-09-19");
  });

  it("scopes optional holiday usage to the selected month", () => {
    const october = { start: "2026-10-01", end: "2026-10-31" };
    const inOctober = buildMonthScopedLeaveUsageEntries({
      startDate: "2026-10-02",
      endDate: "2026-10-02",
      leaveTypeCode: "OH",
      leaveTypeName: "Optional Holiday",
      status: "approved",
      reason: null,
      totalDays: 1,
      durationBreakdown: null,
      monthRange: october,
      holidayNameByDate: new Map([["2026-10-02", "Gandhi Jayanti"]]),
    });
    assert.equal(inOctober.length, 1);
    assert.equal(inOctober[0]!.holidayName, "Gandhi Jayanti");

    const inSeptember = buildMonthScopedLeaveUsageEntries({
      startDate: "2026-10-02",
      endDate: "2026-10-02",
      leaveTypeCode: "OH",
      leaveTypeName: "Optional Holiday",
      status: "approved",
      reason: null,
      totalDays: 1,
      durationBreakdown: null,
      monthRange: september,
      holidayNameByDate: new Map([["2026-10-02", "Gandhi Jayanti"]]),
    });
    assert.equal(inSeptember.length, 0);
  });
});

describe("mergeMonthScopedLeaveUsageEntries", () => {
  it("unions attendance and request dates without double-counting", () => {
    const request = buildMonthScopedLeaveUsageEntries({
      startDate: "2026-09-05",
      endDate: "2026-09-05",
      leaveTypeCode: "CL",
      leaveTypeName: "Casual Leave",
      status: "approved",
      reason: null,
      totalDays: 1,
      durationBreakdown: {
        dayAllocations: [{ date: "2026-09-05", kind: "paid", counted: 1 }],
      },
      monthRange: { start: "2026-09-01", end: "2026-09-30" },
    });
    const attendance = usageEntriesFromAttendanceLeaveDays(
      [
        { date: "2026-09-05", code: "CL" },
        { date: "2026-09-21", code: "CL" },
      ],
      "CL",
    );
    const merged = mergeMonthScopedLeaveUsageEntries(request, attendance);
    assert.deepEqual(
      merged.map((entry) => entry.startDate),
      ["2026-09-05", "2026-09-21"],
    );
    assert.equal(sumUsageEntryDays(merged), 2);
  });

  it("keeps request-only sandwich Sundays that attendance does not mark", () => {
    const request = buildMonthScopedLeaveUsageEntries({
      startDate: "2026-09-26",
      endDate: "2026-09-26",
      leaveTypeCode: "EL",
      leaveTypeName: "Earned Leave",
      status: "approved",
      reason: null,
      totalDays: 2,
      durationBreakdown: {
        dayAllocations: [
          { date: "2026-09-26", kind: "paid", counted: 1 },
          { date: "2026-09-27", kind: "sandwich", counted: 1 },
        ],
      },
      monthRange: { start: "2026-09-01", end: "2026-09-30" },
    });
    const attendance = usageEntriesFromAttendanceLeaveDays(
      [{ date: "2026-09-26", code: "EL" }],
      "EL",
    );
    const merged = mergeMonthScopedLeaveUsageEntries(request, attendance);
    assert.deepEqual(
      merged.map((entry) => entry.startDate),
      ["2026-09-26", "2026-09-27"],
    );
    assert.equal(sumUsageEntryDays(merged), 2);
  });
});
