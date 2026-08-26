import { cache } from "react";

import {
  loadUserProfile,
  type AuthSupabaseClient,
  type ProfileLoadResult,
} from "@/lib/auth/profile-loader";
import { getVerifiedPermissionCodesForUser } from "@/lib/auth/permission-cache";

/**
 * Per-request profile loader for portal layouts and pages.
 * Uses React cache (not unstable_cache) so dynamic cookies/session stay valid.
 *
 * Layout critical path:
 * - skips organization logo signed URL (non-blocking; sidebar loads after paint)
 * - reuses HMAC-verified permission cookie when valid (else RPC fail-closed)
 */
export const getLayoutUserProfile = cache(async function getLayoutUserProfile(
  userId: string,
  email: string,
  supabaseClient?: AuthSupabaseClient,
): Promise<ProfileLoadResult> {
  const t0 = performance.now();
  const verifiedPermissionCodes = await getVerifiedPermissionCodesForUser(userId);

  if (process.env.NODE_ENV === "development") {
    console.info("[layout-timing]", {
      atMs: Math.round(performance.now() - t0),
      label: verifiedPermissionCodes
        ? "layout-profile:permission_cookie_hit"
        : "layout-profile:permission_cookie_miss",
    });
  }

  return loadUserProfile(userId, email, supabaseClient, {
    includeOrganizationLogo: false,
    verifiedPermissionCodes,
  });
});
