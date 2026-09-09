import { SYSTEM_ADMIN_PREFIX } from "@/lib/system-admin/paths";

/** Canonical entry URLs for each portal (no cross-portal ambiguity). */
export const HR_PORTAL_HOME = "/dashboard" as const;

export const PORTAL_HOME_PATHS = {
  hr: HR_PORTAL_HOME,
  ceo: "/ceo",
  manager: "/manager",
  employee: "/employee",
} as const;

export function isHrPortalPath(pathname: string): boolean {
  if (
    pathname === SYSTEM_ADMIN_PREFIX ||
    pathname.startsWith(`${SYSTEM_ADMIN_PREFIX}/`)
  ) {
    return false;
  }
  return pathname === HR_PORTAL_HOME || pathname.startsWith(`${HR_PORTAL_HOME}/`);
}
