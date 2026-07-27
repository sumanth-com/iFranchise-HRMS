import { cache } from "react";

import { loadUserProfile, type ProfileLoadResult } from "@/lib/auth/profile-loader";

/**
 * Per-request profile loader for portal layouts and pages.
 * Uses React cache (not unstable_cache) so dynamic cookies/session stay valid.
 */
export const getLayoutUserProfile = cache(async function getLayoutUserProfile(
  userId: string,
  email: string,
): Promise<ProfileLoadResult> {
  return loadUserProfile(userId, email);
});
