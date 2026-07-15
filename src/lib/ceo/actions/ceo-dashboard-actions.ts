"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getCeoDashboardActivities } from "@/lib/ceo/services/ceo-dashboard-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { CeoActivityItem } from "@/types/ceo-dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

export async function fetchCeoDashboardActivitiesAction(): Promise<
  ActionResult<CeoActivityItem[]>
> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const data = await getCeoDashboardActivities(supabase, profile);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to refresh activity feed.",
    };
  }
}
