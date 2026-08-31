import { hasPermission } from "@/lib/permissions/utils";

export const DASHBOARD_ANNOUNCEMENT_MANAGE_PERMISSION =
  "dashboard_announcement.manage" as const;

export function canManageDashboardAnnouncements(permissionCodes: string[]): boolean {
  return hasPermission(permissionCodes, DASHBOARD_ANNOUNCEMENT_MANAGE_PERMISSION);
}
