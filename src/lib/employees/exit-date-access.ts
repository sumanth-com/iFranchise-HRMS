import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { hasPermission } from "@/lib/permissions/utils";

/** HR and CEO portals may view and set an employee exit date. */
export function canManageEmployeeExit(permissionCodes: readonly string[]) {
  return (
    hasPermission(permissionCodes as string[], PORTAL_PERMISSIONS.hr) ||
    hasPermission(permissionCodes as string[], PORTAL_PERMISSIONS.ceo)
  );
}
