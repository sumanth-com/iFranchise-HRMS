import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_LEAVE_CALENDAR } from "./leave-calendar-engine";
import {
  buildLeaveApplySummary,
  previewLeaveApplication,
} from "./leave-apply-preview";
import type { LeaveApplyContext } from "@/types/leave";

function clBalance(days: number) {
  return {
    leaveTypeCode: "CL",
    leaveTypeName: "Casual Leave",
    balanceDays: days,
    usedDays: 0,
    pendingDays: 0,
    allocatedDays: 12,
    monthUsedDays: 0,
    monthTotalDays: days,
    yearTakenDays: 0,
  };
}

function baseContext(
  overrides: Partial<LeaveApplyContext> = {},
): LeaveApplyContext {
  return {
    calendar: DEFAULT_LEAVE_CALENDAR,
    employee: {
      employeeId: "emp-1",
      joiningDate: "2024-01-01",
      employmentStatus: "active",
      gender: "male",
      usedAndPendingByType: {},
      leaveEligibilityBand: "full_time_confirmed",
    },
    probation: { onProbation: false, month: null, endsOn: null },
    probationRules: {
      durationMonths: 3,
      firstMonthLeaveAllowed: false,
      casualLeaveCap: 2,
      periodLeaveCap: 1,
      periodLeaveFemaleOnly: true,
      carryForwardAllowed: false,
    },
    notice: {
      advanceNoticeHours: 24,
      officeStart: "10:00",
      officeEnd: "19:00",
    },
    allowHalfDay: true,
    maxConsecutiveDays: 30,
    approvalLevels: 2,
    leaveTypes: [
      { id: "cl", code: "CL", name: "Casual Leave", isPaid: true },
    ],
    balances: [clBalance(1)],
    policyDocument: {
      intro: "",
      sections: [],
      contact: { name: "HR", email: "hr@example.com" },
      updatedAt: "2026-01-01",
    },
    applicantRoleCodes: ["employee"],
    ...overrides,
  } as LeaveApplyContext;
}

describe("buildLeaveApplySummary", () => {
  it("breaks down sandwich leave with paid balance before LOP", () => {
    const preview = previewLeaveApplication({
      context: baseContext({
        calendar: {
          ...DEFAULT_LEAVE_CALENDAR,
          holidays: ["2026-09-14"],
        },
      }),
      leaveTypeId: "cl",
      startDate: "2026-09-12",
      endDate: "2026-09-14",
      isHalfDay: false,
      enforceSelfServiceLimits: true,
    });

    assert.ok(preview);
    assert.equal(preview.summary.requestedLeaveDays, 2);
    assert.equal(preview.summary.sandwichLeaveDays, 1);
    assert.equal(preview.summary.totalLeaveDaysCounted, 3);
    assert.equal(preview.summary.paidLeaveDays, 1);
    assert.equal(preview.summary.lopDays, 2);
    assert.equal(preview.summary.remainingBalance, 0);
    assert.equal(
      preview.summary.dayAllocations.filter((day) => day.date === "2026-09-12" && day.kind === "paid")
        .length,
      1,
    );
    assert.equal(
      preview.summary.dayAllocations.filter((day) => day.kind === "lop").length,
      2,
    );
  });

  it("uses full paid balance with zero LOP when sandwich total fits CL balance", () => {
    const preview = previewLeaveApplication({
      context: baseContext({
        calendar: {
          ...DEFAULT_LEAVE_CALENDAR,
          holidays: ["2026-09-14"],
        },
        balances: [clBalance(3)],
      }),
      leaveTypeId: "cl",
      startDate: "2026-09-12",
      endDate: "2026-09-14",
      isHalfDay: false,
    });

    assert.ok(preview);
    assert.equal(preview.summary.totalLeaveDaysCounted, 3);
    assert.equal(preview.summary.paidLeaveDays, 3);
    assert.equal(preview.summary.lopDays, 0);
    assert.equal(preview.summary.remainingBalance, 0);
  });

  it("reports zero eligible days for a weekly off selection", () => {
    const preview = previewLeaveApplication({
      context: baseContext({
        balances: [clBalance(1)],
      }),
      leaveTypeId: "cl",
      startDate: "2026-09-06",
      endDate: "2026-09-06",
      isHalfDay: false,
    });

    assert.ok(preview);
    assert.equal(preview.summary.requestedLeaveDays, 0);
    assert.equal(preview.summary.totalLeaveDaysCounted, 0);
    assert.equal(preview.summary.sandwichLeaveDays, 0);
    assert.equal(
      preview.blockingIssues.some((issue) => issue.code === "duration"),
      true,
    );
  });
});

describe("buildLeaveApplySummary direct", () => {
  it("allocates paid days in date order including sandwich days", () => {
    const preview = previewLeaveApplication({
      context: baseContext({
        balances: [clBalance(2)],
      }),
      leaveTypeId: "cl",
      startDate: "2026-09-12",
      endDate: "2026-09-14",
      isHalfDay: false,
    });

    assert.ok(preview);
    const summary = buildLeaveApplySummary({
      duration: preview.duration,
      split: preview.split,
      availableBalance: 2,
    });
    assert.equal(summary.paidLeaveDays, 2);
    assert.equal(summary.lopDays, 1);
  });
});
