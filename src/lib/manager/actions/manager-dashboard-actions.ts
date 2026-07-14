"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getManagerDashboardActivities } from "@/lib/manager/services/manager-dashboard-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { ManagerActivityItem } from "@/types/manager-dashboard";

export async function fetchManagerDashboardActivitiesAction(
  employeeId?: string,
): Promise<{ generatedAt: string; activities: ManagerActivityItem[] }> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const supabase = await createClient();
  return getManagerDashboardActivities(supabase, profile, employeeId);
}
