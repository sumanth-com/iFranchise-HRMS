import type { Role } from "@/types/auth";
import { AUTH_ROUTES } from "@/lib/auth/constants";

const ROLE_REDIRECT_PRIORITY = [
  "super_admin",
  "hr_admin",
  "manager",
  "employee",
] as const;

export function getRoleRedirectPath(roles: Role[]): string {
  const roleCodes = new Set(roles.map((role) => role.code));

  for (const code of ROLE_REDIRECT_PRIORITY) {
    if (roleCodes.has(code)) {
      return AUTH_ROUTES.dashboard;
    }
  }

  return AUTH_ROUTES.dashboard;
}
