import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LeaveDurationBreakdown } from "./leave-calendar-engine";
import {
  allocateLeaveDaysByBalance,
  calendarMarkForAllocation,
  splitLeaveDaysByBalance,
} from "./leave-policy-engine";

function duration(days: LeaveDurationBreakdown["days"]): LeaveDurationBreakdown {
  const totalLeaveDays = days.reduce((sum, day) => sum + day.counted, 0);
  return {
    startDate: days[0]?.date ?? "",
    endDate: days.at(-1)?.date ?? "",
    requestedDates: days.filter((day) => day.inRequestedRange).map((day) => day.date),
    workingDays: days.filter((day) => day.kind === "working").length,
    halfDays: days.filter((day) => day.kind === "half_day").length,
    weeklyHolidays: 0,
    publicHolidays: 0,
    sandwichDays: days.filter((day) => day.kind === "sandwich").length,
    totalLeaveDays,
    days,
    sandwichExplanations: [],
  };
}

describe("paid leave vs LOP split", () => {
  it("uses 1 paid day and 0 LOP when the request fits the balance", () => {
    assert.deepEqual(
      splitLeaveDaysByBalance({ totalDays: 1, availableBalance: 1, isPaid: true }),
      { paidDays: 1, lopDays: 0 },
    );
  });

  it("uses 1 CL and 2 LOP when 3 days are requested against 1 balance", () => {
    assert.deepEqual(
      splitLeaveDaysByBalance({ totalDays: 3, availableBalance: 1, isPaid: true }),
      { paidDays: 1, lopDays: 2 },
    );
  });

  it("uses 0 paid days and all LOP when the balance is exhausted", () => {
    assert.deepEqual(
      splitLeaveDaysByBalance({ totalDays: 3, availableBalance: 0, isPaid: true }),
      { paidDays: 0, lopDays: 3 },
    );
  });

  it("splits EL independently with the same rule", () => {
    assert.deepEqual(
      splitLeaveDaysByBalance({ totalDays: 4, availableBalance: 1, isPaid: true }),
      { paidDays: 1, lopDays: 3 },
    );
  });
});

describe("calendar day allocation", () => {
  it("marks the first paid working day as Casual Leave and the rest as LOP", () => {
    const result = allocateLeaveDaysByBalance(
      duration([
        {
          date: "2026-09-15",
          kind: "working",
          class: "working",
          counted: 1,
          inRequestedRange: true,
        },
        {
          date: "2026-09-16",
          kind: "working",
          class: "working",
          counted: 1,
          inRequestedRange: true,
        },
        {
          date: "2026-09-17",
          kind: "working",
          class: "working",
          counted: 1,
          inRequestedRange: true,
        },
        {
          date: "2026-09-18",
          kind: "working",
          class: "working",
          counted: 1,
          inRequestedRange: true,
        },
        {
          date: "2026-09-19",
          kind: "working",
          class: "working",
          counted: 1,
          inRequestedRange: true,
        },
      ]),
      1,
    );

    assert.equal(calendarMarkForAllocation(result[0]!.kind, "CL"), "Casual Leave");
    assert.deepEqual(
      result.map((day) => calendarMarkForAllocation(day.kind, "CL")),
      ["Casual Leave", "LOP", "LOP", "LOP", "LOP"],
    );
  });

  it("counts sandwich weekly offs toward paid quota then LOP", () => {
    const result = allocateLeaveDaysByBalance(
      duration([
        {
          date: "2026-09-19",
          kind: "working",
          class: "working",
          counted: 1,
          inRequestedRange: true,
        },
        {
          date: "2026-09-20",
          kind: "sandwich",
          class: "weekly_off",
          counted: 1,
          inRequestedRange: false,
        },
        {
          date: "2026-09-21",
          kind: "working",
          class: "working",
          counted: 1,
          inRequestedRange: true,
        },
      ]),
      1,
    );

    assert.equal(calendarMarkForAllocation(result.find((day) => day.date === "2026-09-19")!.kind, "CL"), "Casual Leave");
    assert.equal(calendarMarkForAllocation(result.find((day) => day.date === "2026-09-20")!.kind, "CL"), "LOP");
    assert.equal(calendarMarkForAllocation(result.find((day) => day.date === "2026-09-21")!.kind, "CL"), "LOP");
  });

  it("labels earned leave paid days with the full name", () => {
    const result = allocateLeaveDaysByBalance(
      duration([
        {
          date: "2026-10-01",
          kind: "working",
          class: "working",
          counted: 1,
          inRequestedRange: true,
        },
        {
          date: "2026-10-02",
          kind: "working",
          class: "working",
          counted: 1,
          inRequestedRange: true,
        },
      ]),
      1,
    );
    assert.equal(calendarMarkForAllocation(result[0]!.kind, "EL"), "Earned Leave");
    assert.equal(calendarMarkForAllocation(result[1]!.kind, "EL"), "LOP");
  });
});
