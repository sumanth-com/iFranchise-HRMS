"use server";

import {
  getVerifiedPermissionPayloadForUser,
  permissionPayloadChanged,
  setPermissionCacheCookie,
} from "@/lib/auth/permission-cache";
import {
  resolveUserPermissionCodes,
  resolveUserRoleCodes,
} from "@/lib/auth/permission-resolver";
import { filterPortalSwitchLinks, canSeePortalSwitcher } from "@/lib/system-admin/portal-switch";
import { createClient, getServerSession } from "@/lib/supabase/server";

export type PortalSwitcherStateResult =
  | {
      success: true;
      portals: ReturnType<typeof filterPortalSwitchLinks>;
      permissionCodes: string[];
      roleCodes: string[];
      hasAccountantAccess: boolean;
    }
  | { success: false; message: string };

/**
 * Resolve portal switcher options from the live DB permission RPC.
 * Bypasses the signed permission cookie so newly granted portal.*.access
 * (e.g. Accountant) appears without logout/login.
 *
 * Visibility: only `it@ifranchise.in` receives portal options; everyone else
 * gets an empty list (switcher stays hidden). Permissions are unchanged.
 */
export async function getPortalSwitcherStateAction(): Promise<PortalSwitcherStateResult> {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    // Visibility-only gate — session email identity, not role/permission.
    if (!canSeePortalSwitcher(session.user.email)) {
      return {
        success: true,
        portals: [],
        permissionCodes: [],
        roleCodes: [],
        hasAccountantAccess: false,
      };
    }

    const supabase = session.supabase ?? (await createClient());
    const previous = await getVerifiedPermissionPayloadForUser(session.user.id);
    const [permissionCodes, roleCodes] = await Promise.all([
      resolveUserPermissionCodes(supabase, session.user.id),
      resolveUserRoleCodes(supabase, session.user.id),
    ]);

    // Only rewrite the cookie when live RPC differs — cookie writes invalidate
    // the App Router client cache and re-run the portal layout waterfall.
    if (permissionPayloadChanged(previous, permissionCodes, roleCodes)) {
      await setPermissionCacheCookie(
        session.user.id,
        permissionCodes,
        true,
        roleCodes,
      );
    }

    const portals = filterPortalSwitchLinks(permissionCodes);

    return {
      success: true,
      portals,
      permissionCodes,
      roleCodes,
      hasAccountantAccess: permissionCodes.includes("portal.accountant.access"),
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to resolve portal access",
    };
  }
}
