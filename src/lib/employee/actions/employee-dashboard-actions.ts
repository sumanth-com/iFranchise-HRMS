"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { getEmployeeDashboardData } from "@/lib/employee/services/employee-dashboard-queries";
import {
  punchManagerAttendance,
  requestManagerAttendanceRegularization,
  updateManagerCheckout,
} from "@/lib/manager/services/manager-self-attendance-service";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  managerAttendancePunchSchema,
  managerAttendanceRegularizationSchema,
  managerUpdateCheckoutSchema,
} from "@/lib/validations/manager-self-attendance";
import type { EmployeeAttendanceActionResult, EmployeeDashboardData } from "@/types/employee-dashboard";

const ATTENDANCE_PERMISSIONS = [PORTAL_PERMISSIONS.employee, "attendance.view"];

export async function getEmployeeDashboardAction(): Promise<EmployeeDashboardData> {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "employee_profile.view",
  ]);
  const supabase = await createClient();
  return getEmployeeDashboardData(supabase, profile);
}

export async function employeeAttendancePunchAction(
  input: unknown,
): Promise<EmployeeAttendanceActionResult> {
  try {
    const profile = await requireServerAnyPermission(ATTENDANCE_PERMISSIONS);
    const supabase = await createClient();
    const parsed = managerAttendancePunchSchema.parse(input);
    await punchManagerAttendance(supabase, profile, parsed);
    revalidatePath(EMPLOYEE_ROUTES.home);
    revalidatePath(EMPLOYEE_ROUTES.attendance);
    revalidatePath("/dashboard/attendance");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update attendance",
    };
  }
}

export async function employeeUpdateCheckoutAction(
  input: unknown,
): Promise<EmployeeAttendanceActionResult> {
  try {
    const profile = await requireServerAnyPermission(ATTENDANCE_PERMISSIONS);
    const supabase = await createClient();
    const parsed = managerUpdateCheckoutSchema.parse(input);
    await updateManagerCheckout(supabase, profile, parsed);
    revalidatePath(EMPLOYEE_ROUTES.home);
    revalidatePath(EMPLOYEE_ROUTES.attendance);
    revalidatePath("/dashboard/attendance");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update checkout",
    };
  }
}

export async function employeeRequestRegularizationAction(
  input: unknown,
): Promise<EmployeeAttendanceActionResult> {
  try {
    const profile = await requireServerAnyPermission(ATTENDANCE_PERMISSIONS);
    const supabase = await createClient();
    const parsed = managerAttendanceRegularizationSchema.parse(input);
    await requestManagerAttendanceRegularization(supabase, profile, parsed);
    revalidatePath(EMPLOYEE_ROUTES.home);
    revalidatePath(EMPLOYEE_ROUTES.attendance);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to submit request",
    };
  }
}
