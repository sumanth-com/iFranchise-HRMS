"use client";

import { RolesSubNav } from "@/components/roles/roles-sub-nav";
import { SYSTEM_ROLES_ROUTES, SYSTEM_ROLES_SUB_NAV } from "@/lib/roles/constants";

export function SuperAdminRolesSubNav() {
  return (
    <RolesSubNav items={SYSTEM_ROLES_SUB_NAV} rootHref={SYSTEM_ROLES_ROUTES.manage} />
  );
}
