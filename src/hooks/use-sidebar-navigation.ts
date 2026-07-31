"use client";

import { useMemo } from "react";

import { SYSTEM_ADMIN_NAV_ITEMS } from "@/config/system-admin-navigation";
import type { NavItem } from "@/config/navigation";
import { getSidebarNavigation } from "@/lib/auth/navigation";
import { SUPER_ADMIN_PORTAL_LABEL, SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { useActivePortal } from "@/providers/active-portal-provider";
import { useAuth } from "@/providers/auth-provider";

export function useSidebarNavigation(): {
  navigation: NavItem[];
  portalHome: string;
  portalLabel: string;
  isSystemAdminPortal: boolean;
} {
  const { activePortal } = useActivePortal();
  const { navigation: hrNavigation, portalHome, portalLabel, permissionCodes, roles } =
    useAuth();
  const isSystemAdminPortal = activePortal === "system";

  const systemNavigation = useMemo(
    () => getSidebarNavigation(SYSTEM_ADMIN_NAV_ITEMS, permissionCodes, roles),
    [permissionCodes, roles],
  );

  if (isSystemAdminPortal) {
    return {
      navigation: systemNavigation,
      portalHome: SYSTEM_ADMIN_ROUTES.dashboard,
      portalLabel: SUPER_ADMIN_PORTAL_LABEL,
      isSystemAdminPortal: true,
    };
  }

  return {
    navigation: hrNavigation,
    portalHome,
    portalLabel,
    isSystemAdminPortal: false,
  };
}
