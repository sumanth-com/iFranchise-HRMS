import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  optionalHolidaysForList,
  remainingOptionalHolidayEntitlement,
  upcomingOptionalHolidays,
} from "./optional-holiday";

describe("optional holiday entitlement", () => {
  it("caps remaining by yearly limit, not by leftover dates", () => {
    assert.equal(
      remainingOptionalHolidayEntitlement({
        yearlyLimit: 2,
        usedOrPending: 0,
        upcomingAvailableDates: 5,
      }),
      2,
    );
  });

  it("caps remaining by upcoming unused dates", () => {
    assert.equal(
      remainingOptionalHolidayEntitlement({
        yearlyLimit: 2,
        usedOrPending: 0,
        upcomingAvailableDates: 1,
      }),
      1,
    );
  });

  it("returns zero after entitlement is used", () => {
    assert.equal(
      remainingOptionalHolidayEntitlement({
        yearlyLimit: 2,
        usedOrPending: 2,
        upcomingAvailableDates: 4,
      }),
      0,
    );
  });

  it("never goes negative", () => {
    assert.equal(
      remainingOptionalHolidayEntitlement({
        yearlyLimit: 2,
        usedOrPending: 3,
        upcomingAvailableDates: 4,
      }),
      0,
    );
  });

  it("keeps past dates in the year list as passed", () => {
    const items = optionalHolidaysForList(
      [
        { id: "1", name: "Holi", date: "2026-03-03" },
        { id: "2", name: "Sri Krishnaashtami", date: "2026-09-04" },
      ],
      new Map(),
      "2026-09-01",
    );
    assert.deepEqual(
      items.map((item) => ({ date: item.date, status: item.status })),
      [
        { date: "2026-03-03", status: "passed" },
        { date: "2026-09-04", status: "available" },
      ],
    );
  });

  it("includes later-year dates when they are in the supplied list", () => {
    const upcoming = upcomingOptionalHolidays(
      [
        { id: "1", name: "Sri Krishnaashtami", date: "2026-09-04" },
        { id: "2", name: "New Year", date: "2027-01-01" },
      ],
      "2026-09-01",
    );
    assert.deepEqual(
      upcoming.map((item) => item.date),
      ["2026-09-04", "2027-01-01"],
    );
  });
});
