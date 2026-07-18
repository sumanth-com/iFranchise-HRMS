"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getEmployeeLeaveCalendarData } from "@/lib/leave/services/leave-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { LeaveCalendarEntry, LeaveHolidayEntry } from "@/types/leave";

export async function getEmployeeLeaveCalendarAction(
  month: number,
  year: number,
): Promise<{ leaves: LeaveCalendarEntry[]; holidays: LeaveHolidayEntry[] }> {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "leave.view",
  ]);
  const supabase = await createClient();
  return getEmployeeLeaveCalendarData(supabase, profile, month, year);
}
