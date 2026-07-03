"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AUTH_ROUTES } from "@/lib/auth/constants";
import { useAuth } from "@/providers/auth-provider";

type RequirePermissionProps = {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
  children: ReactNode;
};

export function RequirePermission({
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  redirectTo,
  children,
}: RequirePermissionProps) {
  const router = useRouter();
  const { hasAnyPermission, hasAllPermissions } = useAuth();

  const requiredPermissions = [
    ...(permission ? [permission] : []),
    ...permissions,
  ];

  const isAllowed =
    requiredPermissions.length === 0
      ? true
      : requireAll
        ? hasAllPermissions(requiredPermissions)
        : hasAnyPermission(requiredPermissions);

  if (!isAllowed) {
    if (redirectTo) {
      router.replace(redirectTo);
      return null;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    router.replace(AUTH_ROUTES.unauthorized);
    return null;
  }

  return <>{children}</>;
}
