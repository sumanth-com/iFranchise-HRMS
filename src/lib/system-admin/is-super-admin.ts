import type { UserProfile } from "@/types/auth";

export function isSuperAdmin(profile: Pick<UserProfile, "roles">) {
  return profile.roles.some((role) => role.code === "super_admin");
}

export function isSuperAdminRoleCode(roleCode: string) {
  return roleCode === "super_admin";
}
