import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { IDLE_ACTIVITY_COOKIE_REFRESH_MS } from "@/lib/auth/constants";
import {
  shouldRefreshActivityInMiddleware,
  shouldRewriteIdleActivityCookie,
} from "@/lib/auth/idle-session";

describe("idle activity cookie throttle", () => {
  it("skips prefetch requests", () => {
    const headers = new Headers({ "Next-Router-Prefetch": "1" });
    assert.equal(
      shouldRefreshActivityInMiddleware({
        method: "GET",
        pathname: "/employee/attendance",
        headers,
        lastActivityMs: null,
      }),
      false,
    );
  });

  it("writes when cookie is missing", () => {
    assert.equal(shouldRewriteIdleActivityCookie(null), true);
    assert.equal(
      shouldRefreshActivityInMiddleware({
        method: "GET",
        pathname: "/employee/leave",
        headers: new Headers(),
        lastActivityMs: null,
      }),
      true,
    );
  });

  it("skips rewrite inside the refresh window so soft-nav keeps the client cache", () => {
    const now = 1_700_000_000_000;
    const recent = now - IDLE_ACTIVITY_COOKIE_REFRESH_MS + 1_000;
    assert.equal(shouldRewriteIdleActivityCookie(recent, now), false);
    assert.equal(
      shouldRefreshActivityInMiddleware({
        method: "GET",
        pathname: "/employee/attendance",
        headers: new Headers(),
        lastActivityMs: recent,
        now,
      }),
      false,
    );
  });

  it("rewrites after the refresh window", () => {
    const now = 1_700_000_000_000;
    const stale = now - IDLE_ACTIVITY_COOKIE_REFRESH_MS - 1;
    assert.equal(shouldRewriteIdleActivityCookie(stale, now), true);
    assert.equal(
      shouldRefreshActivityInMiddleware({
        method: "GET",
        pathname: "/employee/payroll",
        headers: new Headers(),
        lastActivityMs: stale,
        now,
      }),
      true,
    );
  });
});
