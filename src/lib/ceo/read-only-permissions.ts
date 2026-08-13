import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";
import type { UserProfile } from "@/types/auth";

/** Keep portal access and view-only codes so mutate helpers stay false. */
export function toViewOnlyPermissionCodes(codes: string[]): string[] {
  return codes.filter(
    (code) => code.startsWith("portal.") || code.endsWith(".view"),
  );
}

export function toViewOnlyProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    permissionCodes: toViewOnlyPermissionCodes(profile.permissionCodes),
  };
}

export async function requireCeoPortal() {
  return requireServerPermission(PORTAL_PERMISSIONS.ceo);
}

/** View loaders/actions used by CEO and manager HR UIs. */
export function ceoOrViewPermission(viewCode: string) {
  return [viewCode, PORTAL_PERMISSIONS.ceo, PORTAL_PERMISSIONS.manager];
}
