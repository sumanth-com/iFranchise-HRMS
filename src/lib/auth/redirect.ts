import type { Role } from "@/types/auth";
import { getPortalRedirectPath } from "@/lib/auth/portals";

export function getRoleRedirectPath(roles: Role[]): string {
  return getPortalRedirectPath([], roles);
}

export function getAuthenticatedRedirectPath(
  roles: Role[],
  permissionCodes: string[],
  portalRouteFromDb?: string | null,
): string {
  return getPortalRedirectPath(permissionCodes, roles, portalRouteFromDb);
}
