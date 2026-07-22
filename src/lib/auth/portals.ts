import type { Role } from "@/types/auth";

export type PortalKey = "hr" | "ceo" | "manager" | "employee";

/** Canonical portal entry routes (database `roles.portal_route` uses these values). */
export const PORTAL_ROUTES: Record<PortalKey, string> = {
  hr: "/dashboard",
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

export function getPortalForRoles(roles: Role[]): PortalKey | null {
  const roleCodes = new Set(roles.map((role) => role.code));

  for (const portal of PORTAL_PRIORITY) {
    if (
      Object.entries(FALLBACK_ROLE_PORTALS).some(
        ([roleCode, rolePortal]) => rolePortal === portal && roleCodes.has(roleCode),
      )
    ) {
      return portal;
    }
  }

  return null;
}

export function getPortalForPermissions(permissionCodes: Iterable<string>): PortalKey | null {
  for (const portal of PORTAL_PRIORITY) {
    if (hasPortalPermission(permissionCodes, portal)) return portal;
  }

  return null;
}

export function getPortalRedirectPath(
  permissionCodes: Iterable<string>,
  roles: Role[] = [],
  portalRouteFromDb?: string | null,
) {
  const normalizedDbRoute = normalizePortalRoute(portalRouteFromDb);
  if (normalizedDbRoute) return normalizedDbRoute;

  const portal = getPortalForPermissions(permissionCodes) ?? getPortalForRoles(roles);
  return portal ? PORTAL_ROUTES[portal] : "/403";
}

export function getRequiredPortalForPath(pathname: string): PortalKey | null {
  if (pathname === "/" || pathname === "/settings") return "hr";

  if (pathname === "/executive" || pathname.startsWith("/executive/")) {
    return "ceo";
  }

  for (const [portal, route] of Object.entries(PORTAL_ROUTES) as [PortalKey, string][]) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return portal;
  }

  return null;
}

export function canAccessPortalPath(pathname: string, permissionCodes: Iterable<string>) {
  const requiredPortal = getRequiredPortalForPath(pathname);
  if (!requiredPortal) return true;
  return hasPortalPermission(permissionCodes, requiredPortal);
}
