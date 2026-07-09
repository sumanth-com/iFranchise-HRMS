import { hasAnyPermission } from "@/lib/permissions/utils";

export const ROLES_ROUTES = {
  dashboard: "/dashboard/roles",
  manage: "/dashboard/roles/manage",
  permissions: "/dashboard/roles/permissions",
  assignments: "/dashboard/roles/assignments",
  compare: "/dashboard/roles/compare",
} as const;

export const ROLES_SUB_NAV = [
  { title: "Dashboard", href: ROLES_ROUTES.dashboard },
  { title: "Roles", href: ROLES_ROUTES.manage },
  { title: "Permission Matrix", href: ROLES_ROUTES.permissions },
  { title: "User Assignments", href: ROLES_ROUTES.assignments },
  { title: "Compare Roles", href: ROLES_ROUTES.compare },
] as const;

export const ROLE_VIEW_PERMISSIONS = [
  "role.view",
  "permission.view",
  "user_role.view",
] as const;

export function canViewRoles(codes: string[]) {
  return hasAnyPermission(codes, [...ROLE_VIEW_PERMISSIONS]);
}

export function canCreateRole(codes: string[]) {
  return hasAnyPermission(codes, ["role.create", "role.manage"]);
}

export function canEditRole(codes: string[]) {
  return hasAnyPermission(codes, ["role.edit", "role.manage"]);
}

export function canDeleteRole(codes: string[]) {
  return hasAnyPermission(codes, ["role.delete", "role.manage"]);
}

export function canAssignPermissions(codes: string[]) {
  return hasAnyPermission(codes, ["permission.assign", "role.manage"]);
}

export function canAssignUserRole(codes: string[]) {
  return hasAnyPermission(codes, ["permission.assign", "user_role.assign", "role.manage"]);
}
