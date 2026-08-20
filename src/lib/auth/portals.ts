import type { Role } from "@/types/auth";

import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";

export type PortalKey = "hr" | "ceo" | "manager" | "employee";

/** Canonical portal entry routes (database `roles.portal_route` uses these values). */
export const PORTAL_ROUTES: Record<PortalKey, string> = {
  hr: HR_PORTAL_HOME,
  ceo: "/ceo",
  manager: "/manager",
  employee: "/employee",
};

/** Legacy / marketing alias for the executive portal. */
export const EXECUTIVE_PORTAL_ALIASES = ["/executive", "/ceo"] as const;

export const PORTAL_PERMISSIONS: Record<PortalKey, string> = {
  hr: "portal.hr.access",
  ceo: "portal.ceo.access",
  manager: "portal.manager.access",
  employee: "portal.employee.access",
};

const PORTAL_PRIORITY: PortalKey[] = ["hr", "ceo", "manager", "employee"];

/** Highest-privilege role code wins for portal home routing. */
export const ROLE_CODE_PORTAL_PRIORITY = [
  "super_admin",
  "hr_admin",
  "hr_executive",
  "founder",
  "co_founder",
  "ceo",
  "manager",
  "employee",
] as const;

const FALLBACK_ROLE_PORTALS: Record<string, PortalKey> = {
  super_admin: "hr",
  hr_admin: "hr",
  hr_executive: "hr",
  founder: "ceo",
  co_founder: "ceo",
  ceo: "ceo",
  manager: "manager",
  employee: "employee",
};

function hasPortalPermission(permissionCodes: Iterable<string>, portal: PortalKey) {
  const codes = new Set(permissionCodes);
  return codes.has(PORTAL_PERMISSIONS[portal]);
}

export function normalizePortalRoute(route: string | null | undefined): string | null {
  if (!route) return null;
  if (route === "/executive") return PORTAL_ROUTES.ceo;
  return route;
}

export function portalKeyFromRoute(route: string): PortalKey | null {
  const normalized = normalizePortalRoute(route);
  if (!normalized) return null;

  for (const [portal, portalRoute] of Object.entries(PORTAL_ROUTES) as [PortalKey, string][]) {
    if (portalRoute === normalized) return portal;
  }

  return null;
}

export function getPortalForRoleCodes(roleCodes: Iterable<string>): PortalKey | null {
  const codes = new Set(roleCodes);
  for (const code of ROLE_CODE_PORTAL_PRIORITY) {
    const portal = FALLBACK_ROLE_PORTALS[code];
    if (portal && codes.has(code)) return portal;
  }
  return null;
}

export function getPortalRouteForRoleCodes(roleCodes: Iterable<string>): string | null {
  const portal = getPortalForRoleCodes(roleCodes);
  return portal ? PORTAL_ROUTES[portal] : null;
}

export function getPortalForRoles(roles: Role[]): PortalKey | null {
  return getPortalForRoleCodes(roles.map((role) => role.code));
}

export function getPortalForPermissions(permissionCodes: Iterable<string>): PortalKey | null {
  for (const portal of PORTAL_PRIORITY) {
    if (hasPortalPermission(permissionCodes, portal)) return portal;
  }

  return null;
}

export function resolvePrimaryPortal(
  permissionCodes: Iterable<string>,
  roleCodes: Iterable<string> = [],
): PortalKey | null {
  return getPortalForRoleCodes(roleCodes) ?? getPortalForPermissions(permissionCodes);
}

/**
 * Post-login route: assigned role wins over inherited permissions and DB fallbacks.
 */
export function getPortalRedirectPath(
  permissionCodes: Iterable<string>,
  roles: Role[] = [],
  portalRouteFromDb?: string | null,
) {
  const roleCodes = roles.map((role) => role.code);
  const fromRoles = getPortalRouteForRoleCodes(roleCodes);
  const primaryPortal = resolvePrimaryPortal(permissionCodes, roleCodes);
  const fromPermissions = primaryPortal ? PORTAL_ROUTES[primaryPortal] : null;
  const fromDb = normalizePortalRoute(portalRouteFromDb);

  return fromRoles ?? fromPermissions ?? fromDb ?? "/403";
}

export function getRequiredPortalForPath(pathname: string): PortalKey | null {
  if (pathname === HR_PORTAL_HOME || pathname.startsWith(`${HR_PORTAL_HOME}/`)) {
    return "hr";
  }

  if (pathname === "/settings") return "hr";

  if (pathname === "/executive" || pathname.startsWith("/executive/")) {
    return "ceo";
  }

  for (const [portal, route] of Object.entries(PORTAL_ROUTES) as [PortalKey, string][]) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return portal;
  }

  return null;
}

/** Keep users on their provisioned portal; block downgrades (e.g. manager → employee). */
export function getPrimaryPortalRedirectForPath(
  pathname: string,
  permissionCodes: Iterable<string>,
  roleCodes: Iterable<string> = [],
): string | null {
  const codes = Array.from(roleCodes);
  if (codes.includes("super_admin")) return null;

  const pathPortal = getRequiredPortalForPath(pathname);
  if (!pathPortal) return null;

  const primaryPortal = resolvePrimaryPortal(permissionCodes, roleCodes);
  if (!primaryPortal || primaryPortal === pathPortal) return null;

  const primaryRank = PORTAL_PRIORITY.indexOf(primaryPortal);
  const pathRank = PORTAL_PRIORITY.indexOf(pathPortal);
  if (pathRank > primaryRank) {
    return PORTAL_ROUTES[primaryPortal];
  }

  return null;
}

export function canAccessPortalPath(
  pathname: string,
  permissionCodes: Iterable<string>,
  roleCodes: Iterable<string> = [],
) {
  const enforced = getPrimaryPortalRedirectForPath(pathname, permissionCodes, roleCodes);
  if (enforced) return false;

  const requiredPortal = getRequiredPortalForPath(pathname);
  if (!requiredPortal) return true;
  return hasPortalPermission(permissionCodes, requiredPortal);
}
