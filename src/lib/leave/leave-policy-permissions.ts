import { hasPermission } from "@/lib/permissions/utils";
import type { UserProfile } from "@/types/auth";

export const LEAVE_POLICY_MANAGE_PERMISSION = "leave_policy.manage" as const;

export function canEditLeavePolicy(profile: Pick<UserProfile, "permissionCodes" | "roles">) {
  if (hasPermission(profile.permissionCodes, LEAVE_POLICY_MANAGE_PERMISSION)) return true;
  if (hasPermission(profile.permissionCodes, "settings.edit")) return true;
  return profile.roles.some((role) => role.code === "super_admin" || role.code === "hr_admin");
}
