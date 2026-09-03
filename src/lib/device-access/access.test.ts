import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { isTabletHrmsAllowed } from "@/lib/device-access/access";
import { SYSTEM_ADMIN_PERMISSION } from "@/lib/system-admin/constants";
import type { UserProfile } from "@/types/auth";

function profile(permissionCodes: string[], tabletAccessEnabled: boolean): UserProfile {
  return {
    userId: "user",
    email: "user@example.com",
    permissionCodes,
    permissions: [],
    roles: [],
    employee: {
      id: "emp",
      organizationId: "org",
      branchId: "branch",
      employeeCode: "EMP-1",
      firstName: "Test",
      lastName: "User",
      email: "user@example.com",
      employmentStatus: "active",
      status: "active",
      tabletAccessEnabled,
    },
    organization: {
      id: "org",
      name: "Org",
      legalName: null,
      email: null,
      logoStoragePath: null,
      logoUrl: null,
      status: "active",
    },
  };
}

describe("tablet HRMS access", () => {
  it("always allows desktop, even without tablet access", () => {
    assert.equal(
      isTabletHrmsAllowed(profile([PORTAL_PERMISSIONS.employee], false), false),
      true,
    );
  });

  it("blocks employee self-service on tablet when the grant is off", () => {
    assert.equal(
      isTabletHrmsAllowed(profile([PORTAL_PERMISSIONS.employee], false), true),
      false,
    );
  });

  it("allows employee self-service on tablet when the grant is on", () => {
    assert.equal(
      isTabletHrmsAllowed(profile([PORTAL_PERMISSIONS.employee], true), true),
      true,
    );
  });

  it("does not restrict HR, CEO, manager, or system admin on tablet", () => {
    assert.equal(
      isTabletHrmsAllowed(profile([PORTAL_PERMISSIONS.hr], false), true),
      true,
    );
    assert.equal(
      isTabletHrmsAllowed(profile([PORTAL_PERMISSIONS.ceo], false), true),
      true,
    );
    assert.equal(
      isTabletHrmsAllowed(profile([PORTAL_PERMISSIONS.manager], false), true),
      true,
    );
    assert.equal(
      isTabletHrmsAllowed(profile([SYSTEM_ADMIN_PERMISSION], false), true),
      true,
    );
  });
});
