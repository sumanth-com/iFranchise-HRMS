"use server";

import { revalidatePath } from "next/cache";

import { ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { canEditAttendancePolicy } from "@/lib/attendance/attendance-policy-permissions";
import { saveAttendancePolicyDocument } from "@/lib/attendance/services/attendance-policy-mutations";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { attendancePolicyDocumentSchema } from "@/lib/validations/attendance-policy";
import type { AttendancePolicyActionResult } from "@/types/attendance-policy";

function revalidateAttendancePolicyPaths() {
  revalidatePath(EMPLOYEE_ROUTES.attendancePolicy);
  revalidatePath(ATTENDANCE_ROUTES.policy);
  revalidatePath(EMPLOYEE_ROUTES.attendance);
  revalidatePath(ATTENDANCE_ROUTES.list);
}

export async function saveAttendancePolicyDocumentAction(
  input: unknown,
): Promise<AttendancePolicyActionResult> {
  try {
    const profile = await requireServerAnyPermission(["attendance.view"]);
    if (!canEditAttendancePolicy(profile)) {
      return { success: false, message: "You do not have permission to edit the attendance policy." };
    }

    const supabase = await createClient();
    const parsed = attendancePolicyDocumentSchema.parse(input);
    await saveAttendancePolicyDocument(supabase, profile, parsed);
    revalidateAttendancePolicyPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update attendance policy",
    };
  }
}
