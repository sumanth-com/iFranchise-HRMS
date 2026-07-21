import { CEO_ROUTES } from "@/lib/ceo/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import type { PortalVariant } from "@/providers/auth-provider";

export function getPortalVariantFromHome(portalHome: string): PortalVariant {
  if (portalHome.startsWith("/manager")) return "manager";
  if (portalHome.startsWith("/ceo")) return "ceo";
  if (portalHome === "/employee" || portalHome.startsWith("/employee/")) return "employee";
  return "hr";
}

export function getPortalHelpHref(portalHome: string): string {
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
  switch (getPortalVariantFromHome(portalHome)) {
    case "manager":
      return MANAGER_ROUTES.settings;
    case "ceo":
      return CEO_ROUTES.profile;
    case "employee":
      return EMPLOYEE_ROUTES.settings;
    default:
      return "/dashboard/settings";
  }
}
