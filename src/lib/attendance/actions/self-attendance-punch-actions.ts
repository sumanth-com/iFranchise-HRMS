"use server";

import { revalidatePath } from "next/cache";

import { SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import {
  punchManagerAttendance,
  updateManagerCheckout,
} from "@/lib/manager/services/manager-self-attendance-service";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import {
  managerAttendancePunchSchema,
  managerUpdateCheckoutSchema,
} from "@/lib/validations/manager-self-attendance";

const SELF_ATTENDANCE_PUNCH_PERMISSIONS = [
  PORTAL_PERMISSIONS.hr,
  PORTAL_PERMISSIONS.employee,
  PORTAL_PERMISSIONS.manager,
  "attendance.view",
] as const;

export type SelfAttendancePunchResult =
  | { success: true }
  | { success: false; message: string };

function revalidateSelfAttendancePaths() {
  revalidatePath(HR_PORTAL_HOME);
  revalidatePath(SELF_ATTENDANCE_ROUTES.list);
  revalidatePath(EMPLOYEE_ROUTES.home);
  revalidatePath(EMPLOYEE_ROUTES.attendance);
  revalidatePath(MANAGER_ROUTES.home);
  revalidatePath(MANAGER_ROUTES.attendance);
  revalidatePath(SYSTEM_ADMIN_ROUTES.home);
  revalidatePath(SYSTEM_ADMIN_ROUTES.attendance);
}

export { revalidateSelfAttendancePaths };

export async function selfAttendancePunchAction(
  input: unknown,
): Promise<SelfAttendancePunchResult> {
  try {
    const profile = await requireServerAnyPermission([
      ...SELF_ATTENDANCE_PUNCH_PERMISSIONS,
    ]);
    const supabase = await createClient();
    const parsed = managerAttendancePunchSchema.parse(input);
    await punchManagerAttendance(supabase, profile, parsed);
    revalidateSelfAttendancePaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update attendance",
    };
  }
}

export async function selfAttendanceUpdateCheckoutAction(
  input: unknown,
): Promise<SelfAttendancePunchResult> {
  try {
    const profile = await requireServerAnyPermission([
      ...SELF_ATTENDANCE_PUNCH_PERMISSIONS,
    ]);
    const supabase = await createClient();
    const parsed = managerUpdateCheckoutSchema.parse(input);
    await updateManagerCheckout(supabase, profile, parsed);
    revalidateSelfAttendancePaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update checkout",
    };
  }
}
