"use client";

import { useAuth } from "@/providers/auth-provider";

export function usePermissions() {
  const {
    permissionCodes,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasAnyRole,
  } = useAuth();

  return {
    permissionCodes,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasAnyRole,
  };
}

export function useNavigation() {
  const { navigation } = useAuth();
  return navigation;
}
