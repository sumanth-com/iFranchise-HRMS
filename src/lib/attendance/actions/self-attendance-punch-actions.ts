"use server";

import { after } from "next/server";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { isBirthdayOnDate } from "@/lib/employee/birthday-utils";
import {
  punchManagerAttendance,
  saveSelfAttendanceLocation,
  updateManagerCheckout,
} from "@/lib/manager/services/manager-self-attendance-service";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePersonalAttendanceDashboardPaths } from "@/lib/attendance/self-attendance-revalidate";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { revalidateOpenPayrollPaths } from "@/lib/payroll/revalidate-open-payroll";
import type { SelfAttendancePunchResult } from "@/lib/attendance/self-attendance-punch-types";
import {
  managerAttendancePunchSchema,
  managerUpdateCheckoutSchema,
  selfAttendanceLocationSaveSchema,
} from "@/lib/validations/manager-self-attendance";

const SELF_ATTENDANCE_PUNCH_PERMISSIONS = [
  PORTAL_PERMISSIONS.hr,
  PORTAL_PERMISSIONS.employee,
  PORTAL_PERMISSIONS.accountant,
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

function schedulePayrollRefresh(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Awaited<ReturnType<typeof requireServerAnyPermission>>,
  actionName: string,
) {
  after(async () => {
    try {
      const { refreshDraftPayrollItemsForEmployee } = await import(
        "@/lib/payroll/services/payroll-mutations"
      );
      await refreshDraftPayrollItemsForEmployee(supabase, profile, profile.employee.id);
      revalidateOpenPayrollPaths();
    } catch (payrollError) {
      console.error(`[${actionName}] payroll refresh failed`, payrollError);
    }
  });
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
    const punchPromise = punchManagerAttendance(supabase, profile, parsed);
    const birthdayPromise =
      parsed.type === "in"
        ? loadBirthdayCelebrationPayload(
            supabase,
            profile.employee.id,
            profile.employee.firstName || "there",
            getTodayDateString(),
          )
        : Promise.resolve(null);
    const [today, birthdayCelebration] = await Promise.all([
      punchPromise,
      birthdayPromise,
    ]);
    schedulePayrollRefresh(supabase, profile, "selfAttendancePunchAction");
    revalidatePersonalAttendanceDashboardPaths();

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
    schedulePayrollRefresh(supabase, profile, "selfAttendanceUpdateCheckoutAction");
    revalidatePersonalAttendanceDashboardPaths();
    return { success: true, today };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update checkout",
    };
  }
}

export async function selfAttendanceLocationSaveAction(
  input: unknown,
): Promise<{ success: boolean }> {
  try {
    const profile = await requireServerAnyPermission([
      ...SELF_ATTENDANCE_PUNCH_PERMISSIONS,
    ]);
    const parsed = selfAttendanceLocationSaveSchema.parse(input);
    const supabase = await createClient();
    const success = await saveSelfAttendanceLocation(supabase, profile, parsed);
    if (success) revalidatePersonalAttendanceDashboardPaths();
    return { success };
  } catch (error) {
    console.error("[selfAttendanceLocationSaveAction] failed", error);
    return { success: false };
  }
}
