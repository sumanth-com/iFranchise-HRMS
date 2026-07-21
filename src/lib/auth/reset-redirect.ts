import { AUTH_ROUTES } from "@/lib/auth/constants";
import { siteConfig } from "@/config/site";

/** Recovery links land here so Supabase can pass session tokens in the URL hash. */
export function getPasswordResetRedirectTo(invite = false): string {
  const path = invite
    ? `${AUTH_ROUTES.resetPassword}?invite=1`
    : AUTH_ROUTES.resetPassword;

  return `${siteConfig.url}${path}`;
}
