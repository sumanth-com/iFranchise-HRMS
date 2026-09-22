import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSuccessfulLoginAccountUpdates,
  joiningDateMatchesPortalAccessDate,
  toCalendarDate,
} from "@/lib/employees/employment-joining-date";

describe("employment joining date vs portal access", () => {
  it("normalizes timestamps to calendar dates", () => {
    assert.equal(toCalendarDate("2026-09-09T06:01:15.249+00:00"), "2026-09-09");
    assert.equal(toCalendarDate("2026-04-13"), "2026-04-13");
    assert.equal(toCalendarDate(null), null);
  });

  it("detects joining dates that were copied from portal access", () => {
    assert.equal(
      joiningDateMatchesPortalAccessDate("2026-09-09", {
        firstLoginAt: "2026-09-09T06:01:15.249+00:00",
        accountActivatedAt: "2026-09-09T06:01:15.249+00:00",
        invitationSentAt: "2026-09-09T05:59:54.409+00:00",
      }),
      true,
    );
    assert.equal(
      joiningDateMatchesPortalAccessDate("2026-04-13", {
        firstLoginAt: "2026-09-09T06:01:15.249+00:00",
        accountActivatedAt: "2026-09-09T06:01:15.249+00:00",
      }),
      false,
    );
  });

  it("never writes date_of_joining on successful login / activation updates", () => {
    const firstLoginActivate = buildSuccessfulLoginAccountUpdates({
      nowIso: "2026-09-09T06:01:15.249Z",
      isFirstLogin: true,
      shouldActivate: true,
      employmentStatus: "draft",
    });
    assert.equal("date_of_joining" in firstLoginActivate, false);
    assert.equal(firstLoginActivate.first_login_at, "2026-09-09T06:01:15.249Z");
    assert.equal(firstLoginActivate.account_activated_at, "2026-09-09T06:01:15.249Z");
    assert.equal(firstLoginActivate.account_status, "active");
    assert.equal(firstLoginActivate.employment_status, "active");

    const returningUser = buildSuccessfulLoginAccountUpdates({
      nowIso: "2026-09-22T10:00:00.000Z",
      isFirstLogin: false,
      shouldActivate: false,
      employmentStatus: "probation",
    });
    assert.equal("date_of_joining" in returningUser, false);
    assert.equal("first_login_at" in returningUser, false);
    assert.equal(returningUser.last_login_at, "2026-09-22T10:00:00.000Z");
  });
});
