import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "@/lib/permissions/utils";
import { getCurrentUserProfile } from "@/lib/auth/profile-loader";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { redirect } from "next/navigation";

export async function requireAuthenticatedProfile() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect(AUTH_ROUTES.login);
  }

  return profile;
}

export async function requireServerPermission(permission: string) {
  const profile = await requireAuthenticatedProfile();

  if (!hasPermission(profile.permissionCodes, permission)) {
    redirect(AUTH_ROUTES.unauthorized);
  }

  return profile;
}

export async function requireServerAnyPermission(permissions: string[]) {
  const profile = await requireAuthenticatedProfile();

  if (!hasAnyPermission(profile.permissionCodes, permissions)) {
    redirect(AUTH_ROUTES.unauthorized);
  }

  return profile;
}

export async function requireServerAllPermissions(permissions: string[]) {
  const profile = await requireAuthenticatedProfile();

  if (!hasAllPermissions(profile.permissionCodes, permissions)) {
    redirect(AUTH_ROUTES.unauthorized);
  }

  return profile;
}
