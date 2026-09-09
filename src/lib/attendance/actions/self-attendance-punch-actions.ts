"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { isBirthdayOnDate } from "@/lib/employee/birthday-utils";
import {
  punchManagerAttendance,
  updateManagerCheckout,
} from "@/lib/manager/services/manager-self-attendance-service";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { revalidateSelfAttendancePaths } from "@/lib/attendance/self-attendance-revalidate";
import type { SelfAttendancePunchResult } from "@/lib/attendance/self-attendance-punch-types";
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

async function loadBirthdayCelebrationPayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
  firstName: string,
  attendanceDate: string,
): Promise<{
  employeeId: string;
  firstName: string;
  date: string;
} | null> {
  try {
    const { data } = await supabase
      .schema("hrms")
      .from("employees")
      .select("date_of_birth")
      .eq("id", employeeId)
      .maybeSingle();
    const dob = (data as { date_of_birth?: string | null } | null)?.date_of_birth;
    if (!dob || !isBirthdayOnDate(dob, attendanceDate)) return null;
    return {
      employeeId,
      firstName,
      date: attendanceDate.slice(0, 10),
    };
  } catch {
    return null;
  }
}

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

    const birthdayCelebration =
      parsed.type === "in"
        ? await loadBirthdayCelebrationPayload(
            supabase,
            profile.employee.id,
            profile.employee.firstName || "there",
            today.attendanceDate,
          )
        : null;

    return { success: true, today, birthdayCelebration };
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
