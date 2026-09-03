import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { SYSTEM_ADMIN_PERMISSION } from "@/lib/system-admin/constants";
import { hasAnyPermission } from "@/lib/permissions/utils";
import type { UserProfile } from "@/types/auth";

const TABLET_ACCESS_BYPASS_PERMISSIONS = [
  PORTAL_PERMISSIONS.hr,
  PORTAL_PERMISSIONS.ceo,
  SYSTEM_ADMIN_PERMISSION,
] as const;

const TABLET_ACCESS_MANAGE_PERMISSIONS = [
  "employee.edit",
  "organization.edit",
  PORTAL_PERMISSIONS.hr,
  PORTAL_PERMISSIONS.ceo,
  SYSTEM_ADMIN_PERMISSION,
] as const;

const TABLET_ACCESS_VIEW_PERMISSIONS = [
  "organization.view",
  "employee.view",
  PORTAL_PERMISSIONS.ceo,
  SYSTEM_ADMIN_PERMISSION,
] as const;

export function canBypassTabletAccessRestriction(
  permissionCodes: string[],
): boolean {
  return hasAnyPermission(permissionCodes, [...TABLET_ACCESS_BYPASS_PERMISSIONS]);
}

export function canViewDeviceAccess(permissionCodes: string[]): boolean {
  return hasAnyPermission(permissionCodes, [...TABLET_ACCESS_VIEW_PERMISSIONS]);
}

export function canManageDeviceAccess(permissionCodes: string[]): boolean {
  return hasAnyPermission(permissionCodes, [...TABLET_ACCESS_MANAGE_PERMISSIONS]);
}

export function isTabletHrmsAllowed(
  profile: UserProfile,
  isTabletClient: boolean,
): boolean {
  if (!isTabletClient) return true;
  if (canBypassTabletAccessRestriction(profile.permissionCodes)) return true;
  return profile.employee.tabletAccessEnabled === true;
}
