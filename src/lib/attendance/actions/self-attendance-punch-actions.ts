"use server";

import { revalidatePath } from "next/cache";

import { ATTENDANCE_ROUTES, SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { canUpdateOwnCheckout } from "@/lib/attendance/self-checkout-permissions";
import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { CEO_ROUTES } from "@/lib/ceo/constants";
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

import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

export type SelfAttendancePunchResult =
  | { success: true; today: ManagerTodayAttendance }
  | { success: false; message: string };

function revalidateSelfAttendancePaths() {
  revalidatePath(HR_PORTAL_HOME);
  revalidatePath(ATTENDANCE_ROUTES.list);
  revalidatePath(SELF_ATTENDANCE_ROUTES.list);
  revalidatePath(SELF_ATTENDANCE_ROUTES.team);
  revalidatePath(EMPLOYEE_ROUTES.home);
  revalidatePath(EMPLOYEE_ROUTES.attendance);
  revalidatePath(MANAGER_ROUTES.home);
  revalidatePath(MANAGER_ROUTES.attendance);
  revalidatePath(MANAGER_ROUTES.attendanceTeam);
  revalidatePath(MANAGER_ROUTES.reports);
  revalidatePath(MANAGER_ROUTES.notificationsCenter);
  revalidatePath("/manager/profile");
  revalidatePath(CEO_ROUTES.attendance);
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
    const today = await punchManagerAttendance(supabase, profile, parsed);
    try {
      const { refreshDraftPayrollItemsForEmployee } = await import(
        "@/lib/payroll/services/payroll-mutations"
      );
      await refreshDraftPayrollItemsForEmployee(supabase, profile, profile.employee.id);
    } catch (payrollError) {
      console.error("[selfAttendancePunchAction] payroll refresh failed", payrollError);
    }
    revalidateSelfAttendancePaths();
    return { success: true, today };
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
    if (!canUpdateOwnCheckout(profile)) {
      return {
        success: false,
        message:
          "Only HR and executive users can update checkout after punching out.",
      };
    }
    const supabase = await createClient();
    const parsed = managerUpdateCheckoutSchema.parse(input);
    const today = await updateManagerCheckout(supabase, profile, parsed);
    try {
      const { refreshDraftPayrollItemsForEmployee } = await import(
        "@/lib/payroll/services/payroll-mutations"
      );
      await refreshDraftPayrollItemsForEmployee(supabase, profile, profile.employee.id);
    } catch (payrollError) {
      console.error("[selfAttendanceUpdateCheckoutAction] payroll refresh failed", payrollError);
    }
    revalidateSelfAttendancePaths();
    return { success: true, today };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update checkout",
    };
  }
}
