import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  hasOrgWidePeopleAccess,
  scopedEmployeeIds,
} from "@/lib/manager/portal-scope";
import { SYSTEM_ADMIN_PERMISSION } from "@/lib/system-admin/constants";
import type { UserProfile } from "@/types/auth";

function profile(permissionCodes: string[]): UserProfile {
  return {
    userId: "user-1",
    email: "test@example.com",
    roles: [],
    permissionCodes,
    employee: {
      id: "emp-self",
      organizationId: "org-1",
      branchId: null,
      firstName: "Test",
      lastName: "User",
    },
  } as unknown as UserProfile;
}

describe("hasOrgWidePeopleAccess", () => {
  it("treats Super Admin as organization-wide (not self-only)", () => {
    assert.equal(
      hasOrgWidePeopleAccess(profile([SYSTEM_ADMIN_PERMISSION, "employee.view"])),
      true,
    );
  });

  it("keeps HR and CEO org-wide", () => {
    assert.equal(hasOrgWidePeopleAccess(profile([PORTAL_PERMISSIONS.hr])), true);
    assert.equal(hasOrgWidePeopleAccess(profile([PORTAL_PERMISSIONS.ceo])), true);
  });

  it("does not grant org-wide to employee-only profiles", () => {
    assert.equal(
      hasOrgWidePeopleAccess(profile([PORTAL_PERMISSIONS.employee, "employee.view"])),
      false,
    );
  });
});

describe("scopedEmployeeIds", () => {
  it("passes through null scope (org-wide)", () => {
    assert.equal(scopedEmployeeIds(null), null);
  });

  it("keeps an explicit self id list", () => {
    assert.deepEqual(scopedEmployeeIds(["emp-self"]), ["emp-self"]);
  });
});
