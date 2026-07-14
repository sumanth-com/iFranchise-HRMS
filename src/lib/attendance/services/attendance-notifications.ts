import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { notifyEmployee } from "@/lib/notifications/services/notification-service";

export async function notifyAttendanceCorrectionApproved(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  correctionId: string,
  attendanceDate: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId,
    title: "Attendance regularization approved",
    message: `Your attendance regularization for ${attendanceDate} has been approved.`,
    notificationType: "attendance_correction_approved",
    module: "attendance",
    priority: "medium",
    actionUrl: MANAGER_ROUTES.attendance,
    sourceEventKey: `attendance_correction_approved:${correctionId}:${employeeId}`,
    templateKey: "attendance_correction",
    createdBy: profile.userId,
  });
}

export async function notifyAttendanceCorrectionRejected(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  correctionId: string,
  attendanceDate: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId,
    title: "Attendance regularization rejected",
    message: `Your attendance regularization for ${attendanceDate} was rejected. Please contact your manager if you need help.`,
    notificationType: "attendance_correction_rejected",
    module: "attendance",
    priority: "medium",
    actionUrl: MANAGER_ROUTES.attendance,
    sourceEventKey: `attendance_correction_rejected:${correctionId}:${employeeId}`,
    templateKey: "attendance_correction",
    createdBy: profile.userId,
  });
}
