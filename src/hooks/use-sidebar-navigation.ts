"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { SYSTEM_ADMIN_NAV_ITEMS } from "@/config/system-admin-navigation";
import type { NavItem } from "@/config/navigation";
import { getSidebarNavigation } from "@/lib/auth/navigation";
import { SUPER_ADMIN_PORTAL_LABEL, SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { isSystemAdminPath } from "@/lib/system-admin/paths";
import { useActivePortal } from "@/providers/active-portal-provider";
import { useAuth } from "@/providers/auth-provider";

export function useSidebarNavigation(): {
  navigation: NavItem[];
  portalHome: string;
  portalLabel: string;
  isSystemAdminPortal: boolean;
} {
  const pathname = usePathname();
  const { activePortal } = useActivePortal();
  const { navigation: authNavigation, portalHome, portalLabel, permissionCodes, roles } =
    useAuth();

  // Path wins over stale activePortal so Super Admin chrome cannot fall back to HR.
  const isSystemAdminPortal =
    activePortal === "system" || isSystemAdminPath(pathname);

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
    navigation: authNavigation,
    portalHome,
    portalLabel,
    isSystemAdminPortal: false,
  };
}
