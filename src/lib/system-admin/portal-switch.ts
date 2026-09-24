import { normalizeEmployeeEmail } from "@/lib/employees/app-hidden";
import {
  IT_SYSTEM_ACCOUNT_EMAIL,
  isItSystemAccount,
} from "@/lib/employees/it-system-account";
import {
  PORTAL_SWITCH_LINKS,
  SYSTEM_ADMIN_PERMISSION,
} from "@/lib/system-admin/constants";
import { hasPermission } from "@/lib/permissions/utils";

/** Permission required for each portal switcher entry — single source of truth. */
export const PORTAL_SWITCH_PERMISSION_MAP: Record<string, string> = {
  system: SYSTEM_ADMIN_PERMISSION,
  hr: "portal.hr.access",
  ceo: "portal.ceo.access",
  manager: "portal.manager.access",
  accountant: "portal.accountant.access",
  employee: "portal.employee.access",
};

/** Only this authenticated email may see the top-right Portal Switcher. */
export const PORTAL_SWITCHER_ALLOWED_EMAIL = IT_SYSTEM_ACCOUNT_EMAIL;

export type PortalSwitchLink = (typeof PORTAL_SWITCH_LINKS)[number];

/**
 * Visibility gate for the portal switcher (UI only).
 * Uses the authenticated email identity — not roles or permissions.
 */
export function canSeePortalSwitcher(
  email: string | null | undefined,
): boolean {
  return isItSystemAccount({ email: normalizeEmployeeEmail(email) || email });
}

/** Filter registry by live permission codes (no role/email shortcuts). */
export function filterPortalSwitchLinks(
  permissionCodes: readonly string[],
): PortalSwitchLink[] {
  return PORTAL_SWITCH_LINKS.filter((portal) =>
    hasPermission(
      permissionCodes as string[],
      PORTAL_SWITCH_PERMISSION_MAP[portal.portal],
    ),
  );
}
