"use server";

import {
  setPermissionCacheCookie,
} from "@/lib/auth/permission-cache";
import {
  resolveUserPermissionCodes,
  resolveUserRoleCodes,
} from "@/lib/auth/permission-resolver";
import { filterPortalSwitchLinks } from "@/lib/system-admin/portal-switch";
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
 */
export async function getPortalSwitcherStateAction(): Promise<PortalSwitcherStateResult> {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    const supabase = session.supabase ?? (await createClient());
    const [permissionCodes, roleCodes] = await Promise.all([
      resolveUserPermissionCodes(supabase, session.user.id),
      resolveUserRoleCodes(supabase, session.user.id),
    ]);

    // Keep middleware/layout cookie aligned with the fresh RPC result.
    await setPermissionCacheCookie(
      session.user.id,
      permissionCodes,
      true,
      roleCodes,
    );

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
