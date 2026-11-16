import assert from "node:assert/strict";
import { test } from "node:test";

import { navigationDestination } from "./navigation-destination";

test("Organization navigation goes directly to the existing redirect destination", () => {
  assert.equal(navigationDestination("/dashboard/system/organization"), "/dashboard/system/organization/profile");
});

test("other destinations, queries, fragments, and external links remain unchanged", () => {
  for (const href of [
    "/dashboard/system/organization/branches",
    "/dashboard/system/organization?tab=profile",
    "/dashboard/system/organization#section",
    "/dashboard/organization", "/dashboard/system/payroll", "https://example.invalid/", "#section",
  ]) assert.equal(navigationDestination(href), href);
});
