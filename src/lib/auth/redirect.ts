import type { Role } from "@/types/auth";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { getPortalRedirectPath } from "@/lib/auth/portals";

const ROLE_REDIRECT_PRIORITY = [
  "super_admin",
  "hr_admin",
  "hr_executive",
  "founder",
  "co_founder",
  "ceo",
  "manager",
  "employee",
] as const;

export function getRoleRedirectPath(roles: Role[]): string {
  const roleCodes = new Set(roles.map((role) => role.code));

  for (const code of ROLE_REDIRECT_PRIORITY) {
    if (roleCodes.has(code)) return getPortalRedirectPath([], roles);
  }
  return AUTH_ROUTES.dashboard;
}

export function getAuthenticatedRedirectPath(
  roles: Role[],
  permissionCodes: string[],
  portalRouteFromDb?: string | null,
): string {
  return getPortalRedirectPath(permissionCodes, roles, portalRouteFromDb);
}
