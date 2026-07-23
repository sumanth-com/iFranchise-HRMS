import type { NavItem } from "@/config/navigation";
import { hasAnyPermission, hasAnyRole } from "@/lib/permissions/utils";
import type { Role } from "@/types/auth";

export type NavigationItem = NavItem & {
  /** User must have at least one of these permissions */
  permissions?: string[];
  /** User must have at least one of these role codes */
  roles?: string[];
};

export function getSidebarNavigation(
  items: NavigationItem[],
  permissionCodes: string[],
  roles: Role[],
): NavItem[] {
  const seenHrefs = new Set<string>();

  return items.filter((item) => {
    const permissionAllowed = hasAnyPermission(
      permissionCodes,
      item.permissions ?? [],
    );
    const roleAllowed = hasAnyRole(roles, item.roles ?? []);

    if (!permissionAllowed || !roleAllowed) return false;

    if (seenHrefs.has(item.href)) return false;
    seenHrefs.add(item.href);
    return true;
  });
}
