import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canSeePortalSwitcher,
  filterPortalSwitchLinks,
  PORTAL_SWITCHER_ALLOWED_EMAIL,
} from "@/lib/system-admin/portal-switch";

describe("portal switcher visibility", () => {
  it("allows only it@ifranchise.in", () => {
    assert.equal(canSeePortalSwitcher(PORTAL_SWITCHER_ALLOWED_EMAIL), true);
    assert.equal(canSeePortalSwitcher("IT@IFRANCHISE.IN"), true);
    assert.equal(canSeePortalSwitcher(" it@ifranchise.in "), true);
  });

  it("hides the switcher for CEO / HR / Manager / Employee / Accountant / Super Admin emails", () => {
    for (const email of [
      "ceo@ifranchise.in",
      "hr@ifranchise.in",
      "manager@ifranchise.in",
      "employee@ifranchise.in",
      "accountant@ifranchise.in",
      "admin@ifranchise.in",
      "superadmin@ifranchise.in",
      null,
      undefined,
      "",
    ]) {
      assert.equal(canSeePortalSwitcher(email), false);
    }
  });

  it("does not change permission-based portal option filtering for IT", () => {
    const portals = filterPortalSwitchLinks([
      "portal.system.access",
      "portal.hr.access",
      "portal.ceo.access",
      "portal.manager.access",
      "portal.accountant.access",
      "portal.employee.access",
    ]);
    assert.ok(portals.length >= 2);
    assert.ok(portals.some((p) => p.portal === "ceo"));
    assert.ok(portals.some((p) => p.portal === "hr"));
  });
});
