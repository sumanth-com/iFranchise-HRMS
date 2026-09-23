import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canActorDecideLeaveRequest } from "./leave-approval-auth";
import type { UserProfile } from "@/types/auth";

function profile(partial: {
  employeeId: string;
  roleCode?: string;
  permissionCodes?: string[];
}): UserProfile {
  return {
    userId: `user-${partial.employeeId}`,
    email: `${partial.employeeId}@example.com`,
    employee: {
      id: partial.employeeId,
      organizationId: "org-1",
    } as UserProfile["employee"],
    organization: {} as UserProfile["organization"],
    roles: partial.roleCode
      ? [
          {
            id: "r1",
            name: partial.roleCode,
            code: partial.roleCode,
            isSystemRole: true,
            status: "active",
          },
        ]
      : [],
    permissions: [],
    permissionCodes: partial.permissionCodes ?? [],
  };
}

describe("canActorDecideLeaveRequest", () => {
  const base = {
    applicantEmployeeId: "emp-1",
    leaveStatus: "pending",
    pendingLevel: 1,
    executiveApplicant: false,
  };

  it("allows the assigned reporting manager for their team member", () => {
    assert.equal(
      canActorDecideLeaveRequest({
        ...base,
        profile: profile({ employeeId: "mgr-1", roleCode: "manager" }),
        pendingApproverEmployeeId: "mgr-1",
      }),
      true,
    );
  });

  it("rejects an unassigned manager", () => {
    assert.equal(
      canActorDecideLeaveRequest({
        ...base,
        profile: profile({ employeeId: "mgr-2", roleCode: "manager" }),
        pendingApproverEmployeeId: "hr-1",
      }),
      false,
    );
  });

  it("allows HR and CEO without being the assigned step owner", () => {
    assert.equal(
      canActorDecideLeaveRequest({
        ...base,
        profile: profile({ employeeId: "hr-1", roleCode: "hr_admin" }),
        pendingApproverEmployeeId: "mgr-1",
      }),
      true,
    );
    assert.equal(
      canActorDecideLeaveRequest({
        ...base,
        profile: profile({
          employeeId: "ceo-1",
          roleCode: "ceo",
          permissionCodes: ["portal.ceo.access"],
        }),
        pendingApproverEmployeeId: "mgr-1",
      }),
      true,
    );
  });

  it("rejects self-approval", () => {
    assert.equal(
      canActorDecideLeaveRequest({
        ...base,
        applicantEmployeeId: "mgr-1",
        profile: profile({ employeeId: "mgr-1", roleCode: "manager" }),
        pendingApproverEmployeeId: "mgr-1",
      }),
      false,
    );
  });
});
