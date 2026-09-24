import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isExcludedFromProvisioningManagerLookup,
  isHrPortalProvisioningRole,
  isProvisioningHrRole,
  isProvisioningManagerLookupCandidate,
  isProvisioningManagerRole,
} from "@/lib/ceo/provisioning-directory-filters";

describe("provisioning manager lookup eligibility", () => {
  it("includes classic manager roles", () => {
    assert.equal(isProvisioningManagerRole("manager"), true);
    assert.equal(isProvisioningManagerRole("hr_admin"), false);
  });

  it("includes people with direct reports even when their primary role is HR", () => {
    const managerIdsWithReports = new Set(["ekta-id"]);
    assert.equal(
      isProvisioningManagerLookupCandidate({
        roleCode: "hr_admin",
        employeeId: "ekta-id",
        managerIdsWithReports,
      }),
      true,
    );
    assert.equal(
      isProvisioningManagerLookupCandidate({
        roleCode: "hr_admin",
        employeeId: "other-hr",
        managerIdsWithReports,
      }),
      false,
    );
  });

  it("does not exclude real HR emails used by named employees", () => {
    assert.equal(
      isExcludedFromProvisioningManagerLookup({
        email: "hr@ifranchise.in",
        firstName: "Ekta",
        lastName: "Pattanaik",
        employeeCode: "IF2026001",
      }),
      false,
    );
  });

  it("still excludes shell / IT manager-lookup accounts", () => {
    assert.equal(
      isExcludedFromProvisioningManagerLookup({
        email: "ifranchisehr@gmail.com",
        firstName: "ifranchiseHr",
        lastName: "Employee",
      }),
      true,
    );
    assert.equal(
      isExcludedFromProvisioningManagerLookup({
        email: "it@ifranchise.in",
        firstName: "IT",
        lastName: "Team",
      }),
      true,
    );
  });
});

describe("provisioning HR role classification for KPI / Portal Users", () => {
  it("treats only hr_admin and hr_executive as HR provisioning roles", () => {
    assert.equal(isProvisioningHrRole("hr_admin"), true);
    assert.equal(isProvisioningHrRole("hr_executive"), true);
    assert.equal(isProvisioningHrRole("super_admin"), false);
    assert.equal(isProvisioningHrRole("ceo"), false);
    assert.equal(isProvisioningHrRole("manager"), false);
    assert.equal(isProvisioningHrRole("employee"), false);
  });

  it("keeps portal-filter helper including super_admin separately from HR KPI roles", () => {
    assert.equal(isHrPortalProvisioningRole("super_admin"), true);
    assert.equal(isHrPortalProvisioningRole("hr_admin"), true);
    assert.equal(isProvisioningHrRole("super_admin"), false);
  });
});
