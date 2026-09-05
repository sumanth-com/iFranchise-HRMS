import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateLeaveDuration,
  DEFAULT_LEAVE_CALENDAR,
  type LeaveCalendarContext,
} from "./leave-calendar-engine";
import {
  allocateLeaveDaysByBalance,
  splitLeaveDaysFromAllocations,
} from "./leave-policy-engine";
import {
  absenceLeaveDatesForRange,
  sandwichedInterveningDates,
  unpaidAbsenceWeeklyOffDates,
} from "./leave-sandwich-policy";
import { previewLeaveApplication } from "./leave-apply-preview";

const calendar = (holidays: string[] = []): LeaveCalendarContext => ({
  ...DEFAULT_LEAVE_CALENDAR,
  holidays,
});

describe("official sandwich leave policy", () => {
  it("TEST 1: Saturday CL + Monday CL sandwiches Sunday as paid leave (total 3)", () => {
    const cal = calendar(["2026-09-14"]);
    const duration = calculateLeaveDuration({
      startDate: "2026-09-12",
      endDate: "2026-09-14",
      isHalfDay: false,
      calendar: cal,
    });

    assert.equal(duration.sandwichDays, 1);
    assert.equal(duration.totalLeaveDays, 3);
    assert.ok(duration.days.some((day) => day.date === "2026-09-13" && day.kind === "sandwich"));

    const allocations = allocateLeaveDaysByBalance(duration, 3, {
      calendar: cal,
      isPaidLeaveType: true,
    });
    const split = splitLeaveDaysFromAllocations(allocations, true);
    assert.equal(split.paidDays, 3);
    assert.equal(split.lopDays, 0);
  });

  it("TEST 2: Saturday LOP + Monday LOP sandwiches Sunday as LOP", () => {
    const cal = calendar(["2026-09-14"]);
    const duration = calculateLeaveDuration({
      startDate: "2026-09-12",
      endDate: "2026-09-14",
      isHalfDay: false,
      calendar: cal,
    });

    const allocations = allocateLeaveDaysByBalance(duration, 0, {
      calendar: cal,
      isPaidLeaveType: true,
    });
    const split = splitLeaveDaysFromAllocations(allocations, true);
    assert.equal(split.lopDays, 3);
    assert.equal(
      allocations.filter((day) => day.date === "2026-09-13" && day.kind === "lop").length,
      1,
    );
  });

  it("TEST 3: LOP Thu–Sat without resumption makes Sunday LOP", () => {
    const occupied = absenceLeaveDatesForRange(
      ["2026-09-17", "2026-09-18", "2026-09-19"],
      calendar(),
    );
    const unpaid = unpaidAbsenceWeeklyOffDates(
      occupied,
      "2026-09-17",
      "2026-09-21",
      calendar(),
    );
    assert.equal(unpaid.has("2026-09-20"), true);
  });

  it("TEST 4: Friday-only leave does not sandwich Sunday", () => {
    const duration = calculateLeaveDuration({
      startDate: "2026-09-11",
      endDate: "2026-09-11",
      isHalfDay: false,
      calendar: calendar(),
    });
    assert.equal(duration.sandwichDays, 0);
    assert.equal(duration.totalLeaveDays, 1);
  });

  it("TEST 5: leave before and after a configured public holiday sandwiches the holiday", () => {
    const cal = calendar(["2026-09-16"]);
    const requested = ["2026-09-15", "2026-09-16", "2026-09-17"];
    const absence = absenceLeaveDatesForRange(requested, cal);
    const sandwiched = sandwichedInterveningDates(absence, "2026-09-15", "2026-09-17", cal);
    assert.equal(sandwiched.has("2026-09-16"), true);

    const duration = calculateLeaveDuration({
      startDate: "2026-09-15",
      endDate: "2026-09-17",
      isHalfDay: false,
      calendar: cal,
    });
    assert.equal(duration.sandwichDays, 1);
    assert.equal(duration.totalLeaveDays, 3);
  });
});

describe("leave apply preview integration", () => {
  it("shows 2 requested, 1 sandwich, 3 total for Sat–Mon with Monday holiday", () => {
    const preview = previewLeaveApplication({
      context: {
        calendar: calendar(["2026-09-14"]),
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
        notice: { advanceNoticeHours: 24, officeStart: "10:00", officeEnd: "19:00" },
        allowHalfDay: true,
        maxConsecutiveDays: 30,
        approvalLevels: 2,
        leaveTypes: [{ id: "cl", code: "CL", name: "Casual Leave", isPaid: true }],
        balances: [
          {
            leaveTypeCode: "CL",
            leaveTypeName: "Casual Leave",
            balanceDays: 3,
            usedDays: 0,
            pendingDays: 0,
            allocatedDays: 12,
            monthUsedDays: 0,
            monthTotalDays: 3,
            yearTakenDays: 0,
          },
        ],
        policyDocument: {
          intro: "",
          sections: [],
          contact: { phone: "", email: "hr@example.com", address: "" },
          updatedAt: "2026-01-01",
        },
        applicantRoleCodes: ["employee"],
      },
      leaveTypeId: "cl",
      startDate: "2026-09-12",
      endDate: "2026-09-14",
      isHalfDay: false,
    });

    assert.ok(preview);
    assert.equal(preview.summary.requestedLeaveDays, 2);
    assert.equal(preview.summary.sandwichLeaveDays, 1);
    assert.equal(preview.summary.totalLeaveDaysCounted, 3);
    assert.equal(preview.summary.lopDays, 0);
  });
});
