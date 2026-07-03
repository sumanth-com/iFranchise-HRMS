import type { Permission, Role } from "@/types/auth";

export function hasPermission(
  permissionCodes: string[],
  permission: string,
): boolean {
  return permissionCodes.includes(permission);
}

export function hasAnyPermission(
  permissionCodes: string[],
  permissions: string[],
): boolean {
  if (permissions.length === 0) return true;
  return permissions.some((permission) =>
    hasPermission(permissionCodes, permission),
  );
}

export function hasAllPermissions(
  permissionCodes: string[],
  permissions: string[],
): boolean {
  if (permissions.length === 0) return true;
  return permissions.every((permission) =>
    hasPermission(permissionCodes, permission),
  );
}

export function hasRole(roles: Role[], roleCode: string): boolean {
  return roles.some((role) => role.code === roleCode);
}

export function hasAnyRole(roles: Role[], roleCodes: string[]): boolean {
  if (roleCodes.length === 0) return true;
  return roleCodes.some((code) => hasRole(roles, code));
}

export function hasAllRoles(roles: Role[], roleCodes: string[]): boolean {
  if (roleCodes.length === 0) return true;
  return roleCodes.every((code) => hasRole(roles, code));
}

export function getPermissionCodes(permissions: Permission[]): string[] {
  return permissions.map((permission) => permission.code);
}
