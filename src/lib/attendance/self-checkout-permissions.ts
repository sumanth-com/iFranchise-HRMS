import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { hasPermission } from "@/lib/permissions/utils";
import type { UserProfile } from "@/types/auth";

/** Roles that may edit/update their own checkout after punching out. */
const UPDATE_CHECKOUT_ROLE_CODES = new Set([
  "super_admin",
  "hr_admin",
  "hr_executive",
  "ceo",
  "founder",
  "co_founder",
]);

/**
 * Only HR and executive users can use "Update Check Out".
 * Employees and managers see attendance as read-only after checkout.
 */
export function canUpdateOwnCheckout(
  profile: Pick<UserProfile, "roles" | "permissionCodes">,
): boolean {
  if (profile.roles.some((role) => UPDATE_CHECKOUT_ROLE_CODES.has(role.code))) {
    return true;
  }
  if (hasPermission(profile.permissionCodes, PORTAL_PERMISSIONS.hr)) return true;
  if (hasPermission(profile.permissionCodes, PORTAL_PERMISSIONS.ceo)) return true;
  return false;
}
