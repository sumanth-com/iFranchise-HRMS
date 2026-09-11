import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  averageApplicableWorkingHours,
  completedWorkHoursFromPunches,
  elapsedWorkingSeconds,
  formatLiveWorkingDuration,
  formatWorkingDuration,
  workHoursFromCheckInOut,
} from "./attendance-format";

describe("elapsedWorkingSeconds", () => {
  it("counts check-in to current time while still checked in", () => {
    const seconds = elapsedWorkingSeconds(
      "2026-09-02T10:00:00.000Z",
      null,
      new Date("2026-09-02T16:30:00.000Z"),
    );
    assert.equal(seconds, 6 * 3600 + 30 * 60);
    assert.equal(formatWorkingDuration(seconds), "6h 30m");
  });

  it("counts check-in to check-out after punching out", () => {
    const seconds = elapsedWorkingSeconds(
      "2026-09-02T10:00:00.000Z",
      "2026-09-02T19:00:00.000Z",
    );
    assert.equal(seconds, 9 * 3600);
    assert.equal(formatWorkingDuration(seconds), "9h 0m");
  });

  it("is zero without check-in", () => {
    assert.equal(elapsedWorkingSeconds(null, null), 0);
  });

  it("adds prior completed sessions while checked in", () => {
    const seconds = elapsedWorkingSeconds(
      "2026-09-02T14:00:00.000Z",
      null,
      new Date("2026-09-02T16:00:00.000Z"),
      2 * 3600,
    );
    assert.equal(seconds, 4 * 3600);
  });

  it("uses day total prior when checked out after multiple sessions", () => {
    const seconds = elapsedWorkingSeconds(
      "2026-09-02T14:00:00.000Z",
      "2026-09-02T16:00:00.000Z",
      new Date("2026-09-02T18:00:00.000Z"),
      5 * 3600,
    );
    assert.equal(seconds, 5 * 3600);
    assert.equal(formatWorkingDuration(seconds), "5h 0m");
  });
});

describe("formatLiveWorkingDuration", () => {
  it("shows seconds under one hour so the counter advances every second", () => {
    assert.equal(formatLiveWorkingDuration(0), "0m 00s");
    assert.equal(formatLiveWorkingDuration(45), "0m 45s");
    assert.equal(formatLiveWorkingDuration(65), "1m 05s");
    assert.equal(formatLiveWorkingDuration(6 * 3600 + 44 * 60), "6h 44m");
  });
});

describe("workHoursFromCheckInOut", () => {
  it("stores completed sessions only", () => {
    assert.equal(
      workHoursFromCheckInOut(
        "2026-09-02T10:00:00.000Z",
        "2026-09-02T19:00:00.000Z",
      ),
      9,
    );
    assert.equal(workHoursFromCheckInOut("2026-09-02T10:00:00.000Z", null), 0);
  });
});

describe("completedWorkHoursFromPunches", () => {
  it("uses check-in to check-out for 09:59–15:33 IST (= 5h 34m)", () => {
    // 09:59 IST = 04:29 UTC, 15:33 IST = 10:03 UTC
    const hours = completedWorkHoursFromPunches(
      "2026-09-11T04:29:00.000Z",
      "2026-09-11T10:03:00.000Z",
      { storedWorkHours: 13.23, priorWorkSeconds: 0 },
    );
    assert.equal(hours, 5.57);
    assert.equal(formatWorkingDuration(Math.round(hours * 3600)), "5h 34m");
  });

  it("ignores stale stored work_hours when punches exist and prior is empty", () => {
    assert.equal(
      completedWorkHoursFromPunches(
        "2026-09-11T04:29:00.000Z",
        "2026-09-11T10:03:00.000Z",
        { storedWorkHours: 13.23, priorWorkSeconds: 0 },
      ),
      5.57,
    );
  });

  it("keeps explicit multi-session prior day total when larger than current session", () => {
    assert.equal(
      completedWorkHoursFromPunches(
        "2026-09-11T08:30:00.000Z",
        "2026-09-11T10:30:00.000Z",
        { storedWorkHours: 2, priorWorkSeconds: 6 * 3600 },
      ),
      6,
    );
  });
});

describe("averageApplicableWorkingHours", () => {
  it("averages only days with check-in so live hours are not diluted by absents", () => {
    const liveSeconds = 6 * 3600 + 44 * 60;
    const avg = averageApplicableWorkingHours(
      [
        {
          inMonth: true,
          isFuture: false,
          status: "absent",
          checkInAt: null,
          checkOutAt: null,
        },
        {
          inMonth: true,
          isFuture: false,
          isToday: true,
          status: "late",
          checkInAt: "2026-09-02T10:00:00.000Z",
          checkOutAt: null,
        },
        {
          inMonth: true,
          isFuture: false,
          status: "holiday",
          checkInAt: null,
          checkOutAt: null,
        },
        {
          inMonth: true,
          isFuture: false,
          status: "week_off",
          checkInAt: null,
          checkOutAt: null,
        },
      ],
      liveSeconds,
    );
    assert.equal(avg, 6.73);
    assert.equal(formatWorkingDuration(liveSeconds), "6h 44m");
  });
});
