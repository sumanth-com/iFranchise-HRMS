import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canManageEmploymentConfirmations,
  canViewEmploymentConfirmations,
  resolveProbationEndDate,
} from "@/lib/employees/services/employment-confirmation-queries";
import {
  employmentConfirmationConfirmSchema,
  employmentConfirmationDraftSchema,
} from "@/lib/validations/employment-confirmation";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";

describe("resolveProbationEndDate", () => {
  it("prefers recorded employee/master dates over org-wide 3-month duration", () => {
    assert.equal(
      resolveProbationEndDate("2026-04-13", 3, {
        employeeProbationEndDate: "2026-10-13",
      }),
      "2026-10-13",
    );
    assert.equal(
      resolveProbationEndDate("2026-04-13", 3, {
        componentsEndDate: "2026-10-13",
      }),
      "2026-10-13",
    );
    assert.equal(resolveProbationEndDate("2026-04-13", 3), "2026-07-13");
  });
});

describe("employment confirmation permissions", () => {
  it("allows HR editors and CEO to manage confirmations", () => {
    assert.equal(canManageEmploymentConfirmations(["employee.edit"]), true);
    assert.equal(canManageEmploymentConfirmations([PORTAL_PERMISSIONS.ceo]), true);
    assert.equal(canManageEmploymentConfirmations(["performance.view"]), false);
    assert.equal(canViewEmploymentConfirmations(["performance.view"]), true);
  });

  it("rejects HR-only viewers from managing", () => {
    assert.equal(canManageEmploymentConfirmations(["employee.view", "payroll.view"]), false);
  });
});

describe("employment confirmation validation", () => {
  it("requires positive proposed salary and effective date", () => {
    assert.throws(() =>
      employmentConfirmationDraftSchema.parse({
        employeeId: "00000000-0000-4000-8000-000000000001",
        newDesignationId: "00000000-0000-4000-8000-000000000002",
        newGrossSalary: 0,
        effectiveDate: "2026-10-14",
      }),
    );

    const parsed = employmentConfirmationConfirmSchema.parse({
      employeeId: "00000000-0000-4000-8000-000000000001",
      newDesignationId: "00000000-0000-4000-8000-000000000002",
      newGrossSalary: 50_000,
      effectiveDate: "2026-10-14",
      probationEndDate: "2026-10-13",
    });
    assert.equal(parsed.newGrossSalary, 50_000);
    assert.equal(parsed.effectiveDate, "2026-10-14");
  });

  it("accepts draft updates with confirmationId for edit-before-confirm", () => {
    const parsed = employmentConfirmationDraftSchema.parse({
      employeeId: "00000000-0000-4000-8000-000000000001",
      confirmationId: "00000000-0000-4000-8000-000000000099",
      newDesignationId: "00000000-0000-4000-8000-000000000002",
      newGrossSalary: 45_000,
      effectiveDate: "2026-10-14",
    });
    assert.equal(parsed.confirmationId, "00000000-0000-4000-8000-000000000099");
  });

  it("accepts a typed designation title without a predefined id", () => {
    const parsed = employmentConfirmationDraftSchema.parse({
      employeeId: "00000000-0000-4000-8000-000000000001",
      newDesignationTitle: "Senior Franchise Advisor",
      newGrossSalary: 50_000,
      effectiveDate: "2026-10-14",
    });
    assert.equal(parsed.newDesignationTitle, "Senior Franchise Advisor");
    assert.equal(parsed.newDesignationId ?? null, null);
  });

  it("rejects confirmations without designation id or title", () => {
    assert.throws(() =>
      employmentConfirmationDraftSchema.parse({
        employeeId: "00000000-0000-4000-8000-000000000001",
        newGrossSalary: 50_000,
        effectiveDate: "2026-10-14",
      }),
    );
  });
});

describe("payroll settings access gate (super admin only)", () => {
  it("requires Super Admin capability and system portal context", async () => {
    const {
      canAccessPayrollSettings,
      hasPayrollSettingsCapability,
    } = await import("@/lib/payroll/constants");
    assert.equal(
      hasPayrollSettingsCapability({
        roles: [
          {
            id: "1",
            code: "hr_admin",
            name: "HR",
            isSystemRole: true,
            status: "active",
          },
        ],
        permissionCodes: ["payroll.edit", "settings.edit"],
      }),
      false,
    );
    assert.equal(
      hasPayrollSettingsCapability({
        roles: [
          {
            id: "1",
            code: "super_admin",
            name: "Super Admin",
            isSystemRole: true,
            status: "active",
          },
        ],
        permissionCodes: [],
      }),
      true,
    );
    assert.equal(
      canAccessPayrollSettings(
        {
          roles: [
            {
              id: "1",
              code: "hr_admin",
              name: "HR",
              isSystemRole: true,
              status: "active",
            },
          ],
          permissionCodes: ["system.admin.access"],
        },
        { pathname: "/dashboard/payroll/team/run" },
      ),
      false,
    );
    assert.equal(
      canAccessPayrollSettings(
        {
          roles: [
            {
              id: "1",
              code: "super_admin",
              name: "Super Admin",
              isSystemRole: true,
              status: "active",
            },
          ],
          permissionCodes: [],
        },
        { portal: "system" },
      ),
      true,
    );
  });
});
