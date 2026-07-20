"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireServerPermission } from "@/lib/permissions/server";
import { ATTENDANCE_ROUTES, SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { getAttendanceById } from "@/lib/attendance/services/attendance-detail";
import {
  createAttendance,
  softDeleteAttendance,
  updateAttendance,
} from "@/lib/attendance/services/attendance-mutations";
import {
  getAttendanceLookups,
  getAttendanceSummary,
  listAttendance,
} from "@/lib/attendance/services/attendance-queries";
import {
  attendanceFormSchema,
  attendanceListParamsSchema,
} from "@/lib/validations/attendance";
import type {
  AttendanceActionResult,
  AttendanceDetail,
  AttendanceListParams,
  AttendanceListResult,
  AttendanceLookups,
  AttendanceSummary,
} from "@/types/attendance";

async function getAuthenticatedSupabase() {
  return createClient();
}

export async function fetchAttendanceAction(
  params: AttendanceListParams,
): Promise<AttendanceActionResult<AttendanceListResult>> {
  try {
    const profile = await requireServerPermission("attendance.view");
    const supabase = await getAuthenticatedSupabase();
    const parsed = attendanceListParamsSchema.parse(params);
    const data = await listAttendance(supabase, profile, parsed);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to load attendance records",
    };
  }
}

export async function getAttendanceDetailAction(
  attendanceId: string,
): Promise<AttendanceActionResult<AttendanceDetail>> {
  try {
    const profile = await requireServerPermission("attendance.view");
    const supabase = await getAuthenticatedSupabase();
    const data = await getAttendanceById(supabase, profile, attendanceId);

    if (!data) {
      return { success: false, message: "Attendance record not found" };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to load attendance record",
    };
  }
}

export async function getAttendanceLookupsAction(): Promise<
  AttendanceActionResult<AttendanceLookups>
> {
  try {
    const profile = await requireServerPermission("attendance.view");
    const supabase = await getAuthenticatedSupabase();
    const data = await getAttendanceLookups(
      supabase,
      profile.employee.organizationId,
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to load attendance lookups",
    };
  }
}

export async function getAttendanceSummaryAction(
  date?: string,
): Promise<AttendanceActionResult<AttendanceSummary>> {
  try {
    const profile = await requireServerPermission("attendance.view");
    const supabase = await getAuthenticatedSupabase();
    const data = await getAttendanceSummary(supabase, profile, date);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to load attendance summary",
    };
  }
}

export async function createAttendanceAction(
  input: unknown,
): Promise<AttendanceActionResult<{ id: string }>> {
  try {
    const profile = await requireServerPermission("attendance.create");
    const supabase = await getAuthenticatedSupabase();
    const parsed = attendanceFormSchema.parse(input);
    const id = await createAttendance(supabase, profile, parsed);
    revalidatePath(ATTENDANCE_ROUTES.list);
    revalidatePath(SELF_ATTENDANCE_ROUTES.list);
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create attendance",
    };
  }
}

export async function updateAttendanceAction(
  attendanceId: string,
  input: unknown,
): Promise<AttendanceActionResult<null>> {
  try {
    const profile = await requireServerPermission("attendance.edit");
    const supabase = await getAuthenticatedSupabase();
    const parsed = attendanceFormSchema.parse(input);
    await updateAttendance(supabase, profile, attendanceId, parsed);
    revalidatePath(ATTENDANCE_ROUTES.list);
    revalidatePath(ATTENDANCE_ROUTES.detail(attendanceId));
    revalidatePath(ATTENDANCE_ROUTES.edit(attendanceId));
    revalidatePath(SELF_ATTENDANCE_ROUTES.list);
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update attendance",
    };
  }
}

export async function deleteAttendanceAction(
  attendanceId: string,
): Promise<AttendanceActionResult<null>> {
  try {
    const profile = await requireServerPermission("attendance.delete");
    const supabase = await getAuthenticatedSupabase();
    await softDeleteAttendance(supabase, profile, attendanceId);
    revalidatePath(ATTENDANCE_ROUTES.list);
    revalidatePath(SELF_ATTENDANCE_ROUTES.list);
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete attendance",
    };
  }
}
