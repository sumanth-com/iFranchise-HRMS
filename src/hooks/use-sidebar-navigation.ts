"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { SYSTEM_ADMIN_NAV_ITEMS } from "@/config/system-admin-navigation";
import type { NavItem } from "@/config/navigation";
import { getSidebarNavigation } from "@/lib/auth/navigation";
import { SUPER_ADMIN_PORTAL_LABEL, SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { useAuth } from "@/providers/auth-provider";

function isSystemAdminPortalPath(pathname: string): boolean {
  return (
    pathname === SYSTEM_ADMIN_ROUTES.dashboard ||
    pathname.startsWith(`${SYSTEM_ADMIN_ROUTES.dashboard}/`)
  );
}

export function useSidebarNavigation(): {
  navigation: NavItem[];
  portalHome: string;
  portalLabel: string;
  isSystemAdminPortal: boolean;
} {
  const pathname = usePathname();
  const { navigation: hrNavigation, portalHome, portalLabel, permissionCodes, roles } =
    useAuth();
  const isSystemAdminPortal = isSystemAdminPortalPath(pathname);

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
