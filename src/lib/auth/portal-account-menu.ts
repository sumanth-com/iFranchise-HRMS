import { CEO_ROUTES } from "@/lib/ceo/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { isHrPortalPath } from "@/lib/auth/portal-paths";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import type { PortalVariant } from "@/providers/auth-provider";

export function getPortalVariantFromHome(portalHome: string): PortalVariant {
  if (portalHome.startsWith("/manager")) return "manager";
  if (portalHome.startsWith("/ceo")) return "ceo";
  if (portalHome === "/employee" || portalHome.startsWith("/employee/")) return "employee";
  if (portalHome === "/" || isHrPortalPath(portalHome)) return "hr";
  return "hr";
}

export function getPortalHelpHref(portalHome: string): string {
  if (
    portalHome === SYSTEM_ADMIN_ROUTES.home ||
    portalHome.startsWith(`${SYSTEM_ADMIN_ROUTES.home}/`)
  ) {
    return "/dashboard/help";
  }
  switch (getPortalVariantFromHome(portalHome)) {
    case "manager":
      return "/manager/help";
    case "ceo":
      return "/ceo/help";
    case "employee":
      return EMPLOYEE_ROUTES.help;
    default:
      return "/dashboard/help";
  }
}

export function getPortalSettingsHref(portalHome: string): string {
  if (
    portalHome === SYSTEM_ADMIN_ROUTES.home ||
    portalHome.startsWith(`${SYSTEM_ADMIN_ROUTES.home}/`)
  ) {
    return SYSTEM_ADMIN_ROUTES.settings;
  }
  switch (getPortalVariantFromHome(portalHome)) {
    case "manager":
      return MANAGER_ROUTES.settings;
    case "ceo":
      return CEO_ROUTES.settings;
    case "employee":
      return EMPLOYEE_ROUTES.settings;
    default:
      return "/dashboard/settings";
  }
}
