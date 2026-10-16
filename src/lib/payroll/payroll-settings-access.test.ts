import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canAccessPayrollProbation,
  canAccessPayrollSettings,
  canShowTeamPayrollSettingsTab,
  hasPayrollSettingsCapability,
  PAYROLL_SUB_NAV,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

const superAdminProfile = {
  roles: [
    {
      id: "3",
      code: "super_admin",
      name: "Super Admin",
      isSystemRole: true,
      status: "active" as const,
    },
  ],
  permissionCodes: [] as string[],
};

const itWithSystemAccess = {
  roles: [
    {
      id: "1",
      code: "hr_admin",
      name: "HR Admin",
      isSystemRole: true,
      status: "active" as const,
    },
  ],
  permissionCodes: ["system.admin.access", "payroll.view", "payroll.edit"],
};

describe("Team Payroll Settings access", () => {
  it("denies HR and CEO-style profiles without system admin permission", () => {
    assert.equal(
      hasPayrollSettingsCapability({
        roles: [
          {
            id: "1",
            code: "hr_admin",
            name: "HR Admin",
            isSystemRole: true,
            status: "active",
          },
        ],
        permissionCodes: ["payroll.view", "payroll.edit", "settings.edit"],
      }),
      false,
    );
    assert.equal(
      canAccessPayrollSettings({
        roles: [
          {
            id: "2",
            code: "ceo",
            name: "CEO",
            isSystemRole: true,
            status: "active",
          },
        ],
        permissionCodes: ["portal.ceo.access", "payroll.view"],
      }),
      false,
    );
  });

  it("grants capability to super_admin or system.admin.access", () => {
    assert.equal(hasPayrollSettingsCapability(superAdminProfile), true);
    assert.equal(hasPayrollSettingsCapability(itWithSystemAccess), true);
  });

  it("does not show Settings in HR Team Payroll even with system.admin.access", () => {
    assert.equal(
      canAccessPayrollSettings(itWithSystemAccess, {
        pathname: "/dashboard/payroll/team/run",
      }),
      false,
    );
    assert.equal(
      canShowTeamPayrollSettingsTab(itWithSystemAccess, "/dashboard/payroll/team"),
      false,
    );
    assert.equal(
      canAccessPayrollSettings(superAdminProfile, { pathname: "/ceo/payroll/run" }),
      false,
    );
  });

  it("allows Settings only in Super Admin portal context", () => {
    assert.equal(
      canAccessPayrollSettings(superAdminProfile, {
        pathname: "/dashboard/system/payroll/settings",
      }),
      true,
    );
    assert.equal(
      canAccessPayrollSettings(itWithSystemAccess, { portal: "system" }),
      true,
    );
    assert.equal(
      canAccessPayrollSettings(itWithSystemAccess, { portal: "hr" }),
      false,
    );
  });

  it("omits Settings from Team Payroll sub-nav catalog", () => {
    assert.equal(
      PAYROLL_SUB_NAV.some((item) => item.title === "Settings"),
      false,
    );
    assert.ok(
      PAYROLL_SUB_NAV.some((item) => item.section === TEAM_PAYROLL_SECTIONS.probation),
    );
  });

  it("allows HR/CEO payroll viewers to open Probation & Confirmation", () => {
    assert.equal(
      canAccessPayrollProbation({
        permissionCodes: ["payroll.view", "employee.view"],
      }),
      true,
    );
    assert.equal(
      canAccessPayrollProbation({
        permissionCodes: ["portal.ceo.access"],
      }),
      true,
    );
    assert.equal(
      canAccessPayrollProbation({
        permissionCodes: ["bonus.view"],
      }),
      false,
    );
  });
});
