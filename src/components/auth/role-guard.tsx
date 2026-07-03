"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AUTH_ROUTES } from "@/lib/auth/constants";
import { useAuth } from "@/providers/auth-provider";

type RoleGuardProps = {
  roles: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
  children: ReactNode;
};

export function RoleGuard({
  roles,
  requireAll = false,
  fallback = null,
  redirectTo,
  children,
}: RoleGuardProps) {
  const router = useRouter();
  const { roles: userRoles } = useAuth();

  const userRoleCodes = userRoles.map((role) => role.code);
  const isAllowed = requireAll
    ? roles.every((code) => userRoleCodes.includes(code))
    : roles.length === 0 ||
      roles.some((code) => userRoleCodes.includes(code));

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
