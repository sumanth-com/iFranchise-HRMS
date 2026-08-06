import { hasPermission } from "@/lib/permissions/utils";
import type { UserProfile } from "@/types/auth";

export const PAYROLL_POLICY_MANAGE_PERMISSION = "payroll_policy.manage" as const;

export function canEditPayrollPolicy(profile: Pick<UserProfile, "permissionCodes" | "roles">) {
  if (hasPermission(profile.permissionCodes, PAYROLL_POLICY_MANAGE_PERMISSION)) return true;
  if (hasPermission(profile.permissionCodes, "settings.edit")) return true;
  return profile.roles.some((role) => role.code === "super_admin" || role.code === "hr_admin");
}
