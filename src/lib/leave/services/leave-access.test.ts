import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertCanApplyLeaveForEmployee } from "./leave-access";
import type { UserProfile } from "@/types/auth";

function profile(partial: {
  employeeId: string;
  permissionCodes?: string[];
  roleCode?: string;
}): UserProfile {
  return {
    userId: "user-a",
    email: "a@example.com",
    employee: {
      id: partial.employeeId,
      organizationId: "org-1",
    } as UserProfile["employee"],
    organization: {} as UserProfile["organization"],
    roles: partial.roleCode
      ? [{ id: "r1", name: partial.roleCode, code: partial.roleCode, isSystemRole: true, status: "active" }]
      : [],
    permissions: [],
    permissionCodes: partial.permissionCodes ?? [],
  };
}

describe("assertCanApplyLeaveForEmployee", () => {
  it("allows Employee A to apply for Employee A", async () => {
    await assert.doesNotReject(() =>
      assertCanApplyLeaveForEmployee({} as never, profile({ employeeId: "emp-a" }), "emp-a"),
    );
  });

  it("rejects Employee A applying for Employee B", async () => {
    await assert.rejects(
      () =>
        assertCanApplyLeaveForEmployee({} as never, profile({ employeeId: "emp-a" }), "emp-b"),
      /only apply leave for yourself/,
    );
  });

  it("allows HR to apply for another employee in org (app-layer)", async () => {
    await assert.doesNotReject(() =>
      assertCanApplyLeaveForEmployee(
        {} as never,
        profile({ employeeId: "hr-1", permissionCodes: ["leave.manage"] }),
        "emp-b",
      ),
    );
  });
});
