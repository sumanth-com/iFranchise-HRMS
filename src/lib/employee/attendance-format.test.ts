import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  averageApplicableWorkingHours,
  completedWorkHoursFromPunches,
  dayTotalSecondsAfterCheckout,
  elapsedWorkingSeconds,
  formatLiveWorkingDuration,
  formatWorkingDuration,
  sessionWorkingSeconds,
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

  it("counts check-in to check-out after punching out (10:05→16:27 IST ≈ 6h 22m)", () => {
    // 10:05 IST = 04:35 UTC, 16:27 IST = 10:57 UTC
    const seconds = elapsedWorkingSeconds(
      "2026-09-23T04:35:00.000Z",
      "2026-09-23T10:57:00.000Z",
    );
    assert.equal(seconds, 6 * 3600 + 22 * 60);
    assert.equal(formatWorkingDuration(seconds), "6h 22m");
  });

  it("counts 09:00→18:00 as 9h", () => {
    const seconds = elapsedWorkingSeconds(
      "2026-09-02T03:30:00.000Z", // 09:00 IST
      "2026-09-02T12:30:00.000Z", // 18:00 IST
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

  it("does not double-count when prior_work_seconds already equals the session (legacy day total)", () => {
    const session = 6 * 3600 + 22 * 60;
    const seconds = elapsedWorkingSeconds(
      "2026-09-23T04:35:00.000Z",
      "2026-09-23T10:57:00.000Z",
      new Date("2026-09-23T17:14:00.000Z"),
      session,
    );
    assert.equal(seconds, session);
    assert.equal(formatWorkingDuration(seconds), "6h 22m");
  });

  it("recovers single-session rows where prior was doubled (~12h 44m → 6h 22m)", () => {
    const session = 6 * 3600 + 22 * 60;
    const seconds = elapsedWorkingSeconds(
      "2026-09-23T04:35:00.000Z",
      "2026-09-23T10:57:00.000Z",
      new Date(),
      2 * session,
    );
    assert.equal(seconds, session);
    assert.equal(formatWorkingDuration(seconds), "6h 22m");
  });

  it("stops increasing after checkout (ignores now)", () => {
    const seconds = elapsedWorkingSeconds(
      "2026-09-23T04:35:00.000Z",
      "2026-09-23T10:57:00.000Z",
      new Date("2026-09-23T17:14:00.000Z"), // would be 12h 39m if still open
    );
    assert.equal(seconds, 6 * 3600 + 22 * 60);
    assert.notEqual(formatWorkingDuration(seconds), "12h 39m");
  });
});

describe("dayTotalSecondsAfterCheckout", () => {
  it("sums earlier prior + session on first checkout", () => {
    const total = dayTotalSecondsAfterCheckout({
      checkInAt: "2026-09-23T04:35:00.000Z",
      checkOutAt: "2026-09-23T10:57:00.000Z",
      priorWorkSeconds: 0,
      previousCheckOutAt: null,
    });
    assert.equal(total, 6 * 3600 + 22 * 60);
  });

  it("does not double when updating checkout after prior already holds day total", () => {
    const session = 6 * 3600 + 22 * 60;
    const updated = dayTotalSecondsAfterCheckout({
      checkInAt: "2026-09-23T04:35:00.000Z",
      checkOutAt: "2026-09-23T10:57:00.000Z",
      priorWorkSeconds: session,
      previousCheckOutAt: "2026-09-23T10:57:00.000Z",
    });
    assert.equal(updated, session);
  });

  it("replaces old session duration when checkout time changes", () => {
    const oldSession = 6 * 3600;
    const newSession = 6 * 3600 + 22 * 60;
    const earlier = 2 * 3600;
    const updated = dayTotalSecondsAfterCheckout({
      checkInAt: "2026-09-23T04:35:00.000Z",
      checkOutAt: "2026-09-23T10:57:00.000Z",
      priorWorkSeconds: earlier + oldSession,
      previousCheckOutAt: "2026-09-23T10:35:00.000Z",
    });
    assert.equal(updated, earlier + newSession);
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

  it("sums earlier-only prior with current session when prior < session", () => {
    assert.equal(
      completedWorkHoursFromPunches(
        "2026-09-11T08:30:00.000Z",
        "2026-09-11T10:30:00.000Z",
        { priorWorkSeconds: 1 * 3600 },
      ),
      3,
    );
  });

  it("does not use stored work_hours for an open session", () => {
    assert.equal(
      completedWorkHoursFromPunches("2026-09-11T04:29:00.000Z", null, {
        storedWorkHours: 12.65,
        priorWorkSeconds: 0,
      }),
      0,
    );
  });
});

describe("sessionWorkingSeconds", () => {
  it("matches check-out minus check-in only", () => {
    assert.equal(
      sessionWorkingSeconds(
        "2026-09-23T04:35:00.000Z",
        "2026-09-23T10:57:00.000Z",
      ),
      6 * 3600 + 22 * 60,
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
