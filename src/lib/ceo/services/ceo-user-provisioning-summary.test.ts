import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

import type { CeoProvisioningUser } from "@/types/ceo-user-provisioning";

const require = createRequire(import.meta.url);
const Module = require("node:module") as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = Module._load.bind(Module);
Module._load = (request: string, parent: unknown, isMain: boolean) => {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

describe("summarizeExecutiveUsers KPI role buckets", async () => {
  const { summarizeExecutiveUsers } = await import(
    "@/lib/ceo/services/ceo-user-provisioning-queries"
  );

  type SummaryUser = Parameters<typeof summarizeExecutiveUsers>[0][number];

  function user(
    partial: Partial<SummaryUser> &
      Pick<CeoProvisioningUser, "employeeId" | "roleCode" | "roleLabel">,
  ): SummaryUser {
    const firstName = partial.firstName ?? "Test";
    const lastName = partial.lastName ?? "User";
    return {
      employeeCode: "IF-TEST",
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      email: "test@ifranchise.in",
      userId: "user-1",
      portalKey: "employee",
      departmentId: null,
      departmentName: null,
      branchName: null,
      designationTitle: null,
      employmentTypeId: null,
      reportingManagerId: null,
      reportingManagerName: null,
      assignedHrEmployeeId: null,
      assignedHrEmployeeName: null,
      invitationStatus: "active",
      accountStatus: "active",
      sentByName: null,
      invitationSentAt: null,
      acceptedAt: null,
      lastActivityAt: null,
      profileImagePath: null,
      isSelf: false,
      employmentTypeName: null,
      joiningDate: null,
      firstLoginAt: "2026-01-01T00:00:00Z",
      invitationCancelledAt: null,
      ...partial,
    };
  }

  it("counts only hr_admin / hr_executive as HR Users (not super_admin)", () => {
    const summary = summarizeExecutiveUsers([
      user({
        employeeId: "ekta",
        firstName: "Ekta",
        lastName: "Pattanaik",
        roleCode: "hr_admin",
        roleLabel: "HR Admin",
        portalKey: "hr",
      }),
      user({
        employeeId: "sumanth",
        firstName: "Sumanth",
        lastName: "Reddy",
        roleCode: "super_admin",
        roleLabel: "Super Admin",
        portalKey: "hr",
      }),
      user({
        employeeId: "ceo",
        roleCode: "ceo",
        roleLabel: "CEO",
        portalKey: "ceo",
      }),
      user({
        employeeId: "mgr",
        roleCode: "manager",
        roleLabel: "Manager",
        portalKey: "manager",
      }),
      user({
        employeeId: "emp",
        roleCode: "employee",
        roleLabel: "Employee",
        portalKey: "employee",
      }),
    ]);

    assert.equal(summary.hrUsers, 1);
    assert.equal(summary.executiveUsers, 1);
    assert.equal(summary.managers, 1);
    assert.equal(summary.employees, 1);
  });

  it("does not count deactivated HR toward HR Users", () => {
    const summary = summarizeExecutiveUsers([
      user({
        employeeId: "ekta",
        roleCode: "hr_admin",
        roleLabel: "HR Admin",
      }),
      user({
        employeeId: "old-hr",
        roleCode: "hr_executive",
        roleLabel: "HR Executive",
        invitationStatus: "revoked",
        accountStatus: "inactive",
      }),
    ]);

    assert.equal(summary.hrUsers, 1);
    assert.equal(summary.deactivatedUsers, 1);
  });
});
