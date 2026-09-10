import { createAdminClient } from "@/lib/supabase/admin";
import { HR_LEAVE_APPLICANT_ROLE_CODES } from "@/lib/leave/leave-applicant-roles";
import { isHiddenFromEmployeeDirectory } from "@/lib/employee/directory-listing";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { hasPermission } from "@/lib/permissions/utils";
import type { UserProfile } from "@/types/auth";

/** Roles whose own reimbursement claims route to CEO (not HR Team Payroll). */
export const HR_REIMBURSEMENT_APPLICANT_ROLE_CODES = HR_LEAVE_APPLICANT_ROLE_CODES;

export const CEO_REIMBURSEMENT_APPROVER_ROLE_CODES = [
  "ceo",
  "founder",
  "co_founder",
] as const;

export type ReimbursementApprovalQueue = "workforce" | "executive";

export function isHrReimbursementApplicant(roleCodes: string[]): boolean {
  return roleCodes.some((code) =>
    (HR_REIMBURSEMENT_APPLICANT_ROLE_CODES as readonly string[]).includes(code),
  );
}

export function isCeoReimbursementApprover(profile: UserProfile): boolean {
  return (
    profile.roles.some((role) =>
      (CEO_REIMBURSEMENT_APPROVER_ROLE_CODES as readonly string[]).includes(role.code),
    ) || hasPermission(profile.permissionCodes, PORTAL_PERMISSIONS.ceo)
  );
}

export function isHrReimbursementActor(profile: UserProfile): boolean {
  return profile.roles.some((role) =>
    ["hr_admin", "hr_executive", "super_admin"].includes(role.code),
  );
}

/**
 * Active org employees whose claims belong in the CEO reimbursement queue
 * (HR Admin / HR Executive / Super Admin claimants, including IT Team).
 */
export async function listHrReimbursementApplicantEmployeeIds(
  organizationId: string,
): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("user_roles")
    .select(
      `
        employee_id,
        roles!inner (code),
        employees!inner (
          organization_id,
          deleted_at,
          employee_code,
          first_name,
          last_name
        )
      `,
    )
    .eq("employees.organization_id", organizationId)
    .in("roles.code", [...HR_REIMBURSEMENT_APPLICANT_ROLE_CODES])
    .is("deleted_at", null)
    .is("employees.deleted_at", null);

  if (error) throw new Error(error.message);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    if (!employee || !row.employee_id) continue;
    if (
      isHiddenFromEmployeeDirectory(employee.employee_code, {
        employeeCode: employee.employee_code,
        firstName: employee.first_name,
        lastName: employee.last_name,
      })
    ) {
      continue;
    }
    ids.add(row.employee_id as string);
  }
  return Array.from(ids);
}
