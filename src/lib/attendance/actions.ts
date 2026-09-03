"use server";

import { revalidatePath } from "next/cache";

import { revalidateSelfAttendancePaths } from "@/lib/attendance/actions/self-attendance-punch-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { createClient } from "@/lib/supabase/server";
import { toUserFriendlyError } from "@/lib/errors/user-messages";
import { reviewOrganizationAttendanceCorrection } from "@/lib/manager/services/attendance-correction-service";
import { requireServerAnyPermission, requireServerPermission } from "@/lib/permissions/server";
import { ATTENDANCE_ROUTES, SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { PAYROLL_ROUTES, SELF_PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { refreshDraftPayrollItemsForEmployee } from "@/lib/payroll/services/payroll-mutations";
import {
  getAttendanceById,
  getAttendanceCorrectionByAttendanceId,
} from "@/lib/attendance/services/attendance-detail";
import { getManagerTeamScope } from "@/lib/manager/services/team-queries";
import { hasPermission } from "@/lib/permissions/utils";
import {
  createAttendance,
  softDeleteAttendance,
  updateAttendance,
  upsertManualAttendanceStatus,
} from "@/lib/attendance/services/attendance-mutations";
import {
  getAttendanceLookups,
  getEmployeeDepartmentLabel,
  getAttendanceSummary,
  listAttendance,
} from "@/lib/attendance/services/attendance-queries";
import {
  attendanceFormSchema,
  attendanceListParamsSchema,
  manualAttendanceStatusSchema,
} from "@/lib/validations/attendance";
import { teamCorrectionReviewSchema } from "@/lib/validations/manager-team";
import type {
  AttendanceActionResult,
  AttendanceCorrectionDetail,
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
    const profile = await requireServerAnyPermission([
      "attendance.view",
      PORTAL_PERMISSIONS.manager,
      PORTAL_PERMISSIONS.ceo,
    ]);
    const supabase = await getAuthenticatedSupabase();
    const data = await getAttendanceById(supabase, profile, attendanceId);

    if (!data) {
      return { success: false, message: "Attendance record not found" };
    }

    const isOwn = data.employeeId === profile.employee.id;
    const hasHrAccess = hasPermission(profile.permissionCodes, PORTAL_PERMISSIONS.hr);
    const hasCeoAccess = hasPermission(profile.permissionCodes, PORTAL_PERMISSIONS.ceo);
    if (!isOwn && !hasHrAccess && !hasCeoAccess) {
      const { teamIds } = await getManagerTeamScope(supabase, profile);
      if (!teamIds.includes(data.employeeId)) {
        return { success: false, message: "Attendance record not found" };
      }
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
    revalidatePath(SELF_ATTENDANCE_ROUTES.team);
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
    revalidatePath(SELF_ATTENDANCE_ROUTES.team);
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update attendance",
    };
  }
}

export async function setManualAttendanceStatusAction(
  input: unknown,
): Promise<
  AttendanceActionResult<{
    id: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    workHours: number;
    attendanceStatus: "present" | "absent" | "on_leave";
  }>
> {
  try {
    const profile = await requireServerAnyPermission([
      "attendance.create",
      "attendance.edit",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = manualAttendanceStatusSchema.parse(input);
    const saved = await upsertManualAttendanceStatus(supabase, profile, parsed);

    try {
      await refreshDraftPayrollItemsForEmployee(supabase, profile, parsed.employeeId);
    } catch (payrollError) {
      console.error("[setManualAttendanceStatusAction] payroll refresh failed", payrollError);
    }

    revalidatePath(ATTENDANCE_ROUTES.list);
    revalidatePath(SELF_ATTENDANCE_ROUTES.list);
    revalidatePath(SELF_ATTENDANCE_ROUTES.team);
    revalidateSelfAttendancePaths();
    revalidatePath(EMPLOYEE_ROUTES.payroll);
    revalidatePath(PAYROLL_ROUTES.run);
    revalidatePath(PAYROLL_ROUTES.payslips);
    revalidatePath(SELF_PAYROLL_ROUTES.list);
    revalidatePath(SELF_PAYROLL_ROUTES.team);

    return {
      success: true,
      data: {
        ...saved,
        attendanceStatus: parsed.attendanceStatus,
      },
    };
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
    revalidatePath(SELF_ATTENDANCE_ROUTES.team);
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to delete attendance"),
    };
  }
}

export async function fetchEmployeeDepartmentLabelAction(
  employeeId: string,
): Promise<AttendanceActionResult<string | null>> {
  try {
    const profile = await requireServerPermission("attendance.view");
    const supabase = await getAuthenticatedSupabase();
    const label = await getEmployeeDepartmentLabel(supabase, employeeId);
    return { success: true, data: label };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to load employee department"),
    };
  }
}

export async function getAttendanceCorrectionDetailAction(
  attendanceId: string,
): Promise<AttendanceActionResult<AttendanceCorrectionDetail>> {
  try {
    const profile = await requireServerAnyPermission([
      "attendance.view",
      PORTAL_PERMISSIONS.manager,
      PORTAL_PERMISSIONS.ceo,
    ]);
    const supabase = await getAuthenticatedSupabase();
    const data = await getAttendanceCorrectionByAttendanceId(
      supabase,
      profile,
      attendanceId,
    );

    if (!data) {
      return { success: false, message: "No regularization request found for this record." };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load regularization request",
    };
  }
}

function revalidateTeamAttendancePaths() {
  revalidateSelfAttendancePaths();
  revalidatePath(SELF_ATTENDANCE_ROUTES.team);
  revalidatePath(SELF_ATTENDANCE_ROUTES.list);
  revalidatePath(ATTENDANCE_ROUTES.list);
}

export async function approveAttendanceCorrectionAction(input: unknown) {
  try {
    teamCorrectionReviewSchema.parse(input);
    const profile = await requireServerPermission("attendance.approve");
    const supabase = await getAuthenticatedSupabase();
    const result = await reviewOrganizationAttendanceCorrection(
      supabase,
      profile,
      input,
      "approved",
    );
    revalidateTeamAttendancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof Error ? error.message : "Failed to approve regularization.",
    };
  }
}

export async function rejectAttendanceCorrectionAction(input: unknown) {
  try {
    teamCorrectionReviewSchema.parse(input);
    const profile = await requireServerPermission("attendance.approve");
    const supabase = await getAuthenticatedSupabase();
    const result = await reviewOrganizationAttendanceCorrection(
      supabase,
      profile,
      input,
      "rejected",
    );
    revalidateTeamAttendancePaths();
    return result;
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof Error ? error.message : "Failed to reject regularization.",
    };
  }
}
