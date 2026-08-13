import {
  PORTAL_PERMISSIONS,
  PORTAL_ROUTES,
  type PortalKey,
} from "@/lib/auth/portals";
import { SYSTEM_ADMIN_PERMISSION, SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { MODULE_LABELS } from "@/lib/validations/roles";
import type { PermissionCatalogItem, RoleAccessPreview } from "@/types/roles";

const PORTAL_LABELS: Record<PortalKey, string> = {
  hr: "HR Portal",
  ceo: "CEO Portal",
  manager: "Manager Portal",
  employee: "Employee Portal",
};

const ROLE_PORTAL_HINTS: Record<string, PortalKey> = {
  super_admin: "hr",
  hr_admin: "hr",
  hr_executive: "hr",
  founder: "ceo",
  co_founder: "ceo",
  ceo: "ceo",
  manager: "manager",
  employee: "employee",
};

function humanizeModule(module: string) {
  return MODULE_LABELS[module] ?? module.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function portalFromKey(key: string | null | undefined): PortalKey | null {
  if (key === "hr" || key === "ceo" || key === "manager" || key === "employee") return key;
  return null;
}

function uniquePortals(
  items: RoleAccessPreview["portals"],
): RoleAccessPreview["portals"] {
  const seen = new Set<string>();
  const result: RoleAccessPreview["portals"] = [];
  for (const item of items) {
    const id = item.key;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(item);
  }
  return result;
}

function groupByModule(permissions: PermissionCatalogItem[]) {
  const map = new Map<string, Set<string>>();
  for (const perm of permissions) {
    const actions = map.get(perm.module) ?? new Set<string>();
    actions.add(perm.action);
    map.set(perm.module, actions);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => humanizeModule(a).localeCompare(humanizeModule(b)))
    .map(([module, actions]) => ({
      module,
      label: humanizeModule(module),
      actions: [...actions].map(humanizeAction).sort((a, b) => a.localeCompare(b)),
    }));
}

export function buildRoleAccessPreview(input: {
  roleCode: string;
  portalKey: string | null;
  portalRoute: string | null;
  grantedPermissions: PermissionCatalogItem[];
  catalogPermissions: PermissionCatalogItem[];
}): RoleAccessPreview {
  const codes = new Set(input.grantedPermissions.map((p) => p.code));
  const portals: RoleAccessPreview["portals"] = [];

  if (input.roleCode === "super_admin" || codes.has(SYSTEM_ADMIN_PERMISSION)) {
    portals.push({
      key: "super_admin",
      label: "Super Admin Portal (administration + self-service)",
      route: SYSTEM_ADMIN_ROUTES.home,
    });
  }

  const hinted =
    portalFromKey(input.portalKey) ?? ROLE_PORTAL_HINTS[input.roleCode] ?? null;

  if (hinted) {
    portals.push({
      key: hinted,
      label: PORTAL_LABELS[hinted],
      route: input.portalRoute || PORTAL_ROUTES[hinted],
    });
  }

  for (const [portal, permission] of Object.entries(PORTAL_PERMISSIONS) as [
    PortalKey,
    string,
  ][]) {
    if (codes.has(permission)) {
      portals.push({
        key: portal,
        label: PORTAL_LABELS[portal],
        route: PORTAL_ROUTES[portal],
      });
    }
  }

  const grantedIds = new Set(input.grantedPermissions.map((p) => p.id));
  const restricted = input.catalogPermissions.filter((p) => !grantedIds.has(p.id));

  return {
    portals: uniquePortals(portals),
    modules: groupByModule(input.grantedPermissions),
    restrictedModules: groupByModule(restricted),
  };
}
