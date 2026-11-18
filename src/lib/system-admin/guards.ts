import { AUTH_ROUTES } from "@/lib/auth/constants";
import { getCurrentUserProfile } from "@/lib/auth/profile-loader";
import { isSuperAdmin } from "@/lib/system-admin/is-super-admin";
import { redirect } from "next/navigation";

export async function requireSuperAdminProfile() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect(AUTH_ROUTES.login);
  }
  if (!isSuperAdmin(profile)) {
    redirect(AUTH_ROUTES.unauthorized);
  }
  return profile;
}

/** Keep system-only modules on their dedicated Super Admin portal routes. */
export async function redirectSuperAdminToSystemPortal(href: string): Promise<never> {
  await requireSuperAdminProfile();
  redirect(href);
}
