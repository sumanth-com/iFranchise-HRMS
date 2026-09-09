import type { Role } from "@/types/auth";

import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";
import { SYSTEM_ADMIN_PERMISSION, SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { isSystemAdminPath } from "@/lib/system-admin/paths";

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

/** Business portals only — Super Admin uses the system portal, not HR by default. */
const FALLBACK_ROLE_PORTALS: Record<string, PortalKey> = {
  hr_admin: "hr",
  hr_executive: "hr",
  founder: "ceo",
  co_founder: "ceo",
  ceo: "ceo",
  manager: "manager",
  employee: "employee",
};

function permissionCodeSet(permissionCodes: Iterable<string>) {
  return permissionCodes instanceof Set
    ? permissionCodes
    : new Set(permissionCodes);
}

function hasPortalPermission(permissionCodes: Iterable<string>, portal: PortalKey) {
  return permissionCodeSet(permissionCodes).has(PORTAL_PERMISSIONS[portal]);
}

function hasAnyBusinessPortalPermission(permissionCodes: Iterable<string>) {
  const codes = permissionCodeSet(permissionCodes);
  return PORTAL_PRIORITY.some((portal) => codes.has(PORTAL_PERMISSIONS[portal]));
}

function isSuperAdminRole(roleCodes: Iterable<string>) {
  return Array.from(roleCodes).includes("super_admin");
}

/** Super Admin home when no explicit business portal.*.access is granted. */
export function resolveSystemAdminHomePath(
  permissionCodes: Iterable<string>,
  roleCodes: Iterable<string> = [],
): string | null {
  const codes = permissionCodeSet(permissionCodes);
  const hasSystem =
    isSuperAdminRole(roleCodes) || codes.has(SYSTEM_ADMIN_PERMISSION);
  if (!hasSystem) return null;
  if (hasAnyBusinessPortalPermission(codes)) {
    // Explicit portal grants may be added later; login still prefers Super Admin home
    // when the user is a Super Admin.
    if (isSuperAdminRole(roleCodes)) return SYSTEM_ADMIN_ROUTES.home;
    return null;
  }
  return SYSTEM_ADMIN_ROUTES.home;
}

export function normalizePortalRoute(route: string | null | undefined): string | null {
  if (!route) return null;
  if (route === "/executive") return PORTAL_ROUTES.ceo;
  return route;
}

export function portalKeyFromRoute(route: string): PortalKey | null {
  const normalized = normalizePortalRoute(route);
  if (!normalized) return null;
  if (isSystemAdminPath(normalized)) return null;

  for (const [portal, portalRoute] of Object.entries(PORTAL_ROUTES) as [PortalKey, string][]) {
    if (portalRoute === normalized) return portal;
  }

  return null;
}

export function getPortalForRoleCodes(roleCodes: Iterable<string>): PortalKey | null {
  const codes = new Set(roleCodes);
  for (const code of ROLE_CODE_PORTAL_PRIORITY) {
    if (code === "super_admin") continue;
    const portal = FALLBACK_ROLE_PORTALS[code];
    if (portal && codes.has(code)) return portal;
  }
  return null;
}

export function getPortalRouteForRoleCodes(roleCodes: Iterable<string>): string | null {
  const codes = new Set(roleCodes);
  if (codes.has("super_admin")) {
    return SYSTEM_ADMIN_ROUTES.home;
  }
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
 * Super Admin without explicit business portal grants lands on the system portal.
 * Explicit portal.*.access (e.g. IT multi-portal role) enables switcher + path access
 * but does not change the Super Admin login home.
 */
export function getPortalRedirectPath(
  permissionCodes: Iterable<string>,
  roles: Role[] = [],
  portalRouteFromDb?: string | null,
) {
  const roleCodes = roles.map((role) => role.code);
  const systemHome = resolveSystemAdminHomePath(permissionCodes, roleCodes);
  if (systemHome && isSuperAdminRole(roleCodes)) {
    return systemHome;
  }

  const fromRoles = getPortalRouteForRoleCodes(roleCodes);
  const primaryPortal = resolvePrimaryPortal(permissionCodes, roleCodes);
  const fromPermissions = primaryPortal ? PORTAL_ROUTES[primaryPortal] : null;
  const fromDb = normalizePortalRoute(portalRouteFromDb);

  if (systemHome && !fromRoles && !fromPermissions) {
    return systemHome;
  }

  return fromRoles ?? fromPermissions ?? fromDb ?? systemHome ?? "/403";
}

export function getRequiredPortalForPath(pathname: string): PortalKey | null {
  // System admin lives under /dashboard/system — not the HR portal.
  if (isSystemAdminPath(pathname)) {
    return null;
  }

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

/**
 * Keep users on portals they are entitled to.
 * Portal access is permission-based — Super Admin is not exempt from portal.*.access checks.
 */
export function getPrimaryPortalRedirectForPath(
  pathname: string,
  permissionCodes: Iterable<string>,
  roleCodes: Iterable<string> = [],
): string | null {
  // System paths are authorized via system.admin.access in middleware, not portal.*.access.
  if (isSystemAdminPath(pathname)) {
    return null;
  }

  const pathPortal = getRequiredPortalForPath(pathname);
  if (!pathPortal) return null;

  if (hasPortalPermission(permissionCodes, pathPortal)) {
    return null;
  }

  const primaryPortal = resolvePrimaryPortal(permissionCodes, roleCodes);
  return (
    resolveSystemAdminHomePath(permissionCodes, roleCodes) ??
    (primaryPortal ? PORTAL_ROUTES[primaryPortal] : null) ??
    getPortalRouteForRoleCodes(roleCodes)
  );
}

export function canAccessPortalPath(
  pathname: string,
  permissionCodes: Iterable<string>,
  roleCodes: Iterable<string> = [],
) {
  if (isSystemAdminPath(pathname)) {
    return (
      isSuperAdminRole(roleCodes) ||
      permissionCodeSet(permissionCodes).has(SYSTEM_ADMIN_PERMISSION)
    );
  }

  const enforced = getPrimaryPortalRedirectForPath(pathname, permissionCodes, roleCodes);
  if (enforced) return false;

  const requiredPortal = getRequiredPortalForPath(pathname);
  if (!requiredPortal) return true;
  return hasPortalPermission(permissionCodes, requiredPortal);
}
