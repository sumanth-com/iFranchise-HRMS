import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertCeoOnlyReimbursementDecision,
  isCeoReimbursementApprover,
} from "@/lib/payroll/reimbursement-approval-routing";
import {
  canApproveReimbursement,
  canDeleteReimbursement,
} from "@/lib/payroll/constants";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import type { UserProfile } from "@/types/auth";

function profile(input: {
  roles: string[];
  permissionCodes: string[];
}): UserProfile {
  return {
    userId: "user-1",
    email: "test@example.com",
    roles: input.roles.map((code) => ({
      id: code,
      code,
      name: code,
    })),
    permissionCodes: input.permissionCodes,
    employee: {
      id: "emp-1",
      organizationId: "org-1",
      branchId: null,
      firstName: "Test",
      lastName: "User",
    },
  } as unknown as UserProfile;
}

describe("reimbursement CEO-only decisions", () => {
  it("recognizes CEO portal / founder roles as approvers", () => {
    assert.equal(
      isCeoReimbursementApprover(
        profile({
          roles: ["ceo"],
          permissionCodes: [PORTAL_PERMISSIONS.ceo],
        }),
      ),
      true,
    );
    assert.equal(
      isCeoReimbursementApprover(
        profile({
          roles: ["hr_admin"],
          permissionCodes: ["reimbursement.approve", PORTAL_PERMISSIONS.hr],
        }),
      ),
      false,
    );
    assert.equal(
      isCeoReimbursementApprover(
        profile({
          roles: ["accountant"],
          permissionCodes: ["reimbursement.view", PORTAL_PERMISSIONS.accountant],
        }),
      ),
      false,
    );
  });

  it("blocks HR and Accountant from decision helper", () => {
    assert.throws(
      () =>
        assertCeoOnlyReimbursementDecision(
          profile({
            roles: ["hr_admin"],
            permissionCodes: ["reimbursement.approve", PORTAL_PERMISSIONS.hr],
          }),
        ),
      /Only the CEO/,
    );
    assert.throws(
      () =>
        assertCeoOnlyReimbursementDecision(
          profile({
            roles: ["accountant"],
            permissionCodes: [PORTAL_PERMISSIONS.accountant],
          }),
        ),
      /Only the CEO/,
    );
  });

  it("allows CEO decision helper", () => {
    assert.doesNotThrow(() =>
      assertCeoOnlyReimbursementDecision(
        profile({
          roles: ["ceo"],
          permissionCodes: [PORTAL_PERMISSIONS.ceo],
        }),
      ),
    );
  });

  it("UI approve/delete helpers require CEO portal, not reimbursement.approve alone", () => {
    assert.equal(canApproveReimbursement(["reimbursement.approve"]), false);
    assert.equal(canApproveReimbursement([PORTAL_PERMISSIONS.hr]), false);
    assert.equal(canApproveReimbursement([PORTAL_PERMISSIONS.accountant]), false);
    assert.equal(canApproveReimbursement([PORTAL_PERMISSIONS.ceo]), true);
    assert.equal(canDeleteReimbursement([PORTAL_PERMISSIONS.hr]), false);
    assert.equal(canDeleteReimbursement([PORTAL_PERMISSIONS.ceo]), true);
  });
});
