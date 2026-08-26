import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { requireActiveCeoApproverEmployeeIds } from "@/lib/leave/services/leave-queries";
import { notifyEmployee } from "@/lib/notifications/services/notification-service";

function formatHoursLabel(hours: number) {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

export async function notifyAttendanceCheckedIn(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  attendanceDate: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId: profile.employee.id,
    title: "Checked in",
    message: `Your check-in for ${attendanceDate} was recorded.`,
    notificationType: "attendance_check_in",
    module: "attendance",
    priority: "low",
    actionUrl: MANAGER_ROUTES.profile,
    sourceEventKey: `attendance_check_in:${profile.employee.id}:${attendanceDate}`,
    createdBy: profile.userId,
  });
}

export async function notifyAttendanceCheckedOut(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  attendanceDate: string,
  workHours: number,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId: profile.employee.id,
    title: "Checked out",
    message: `Your check-out for ${attendanceDate} was recorded. Working hours: ${formatHoursLabel(workHours)}.`,
    notificationType: "attendance_check_out",
    module: "attendance",
    priority: "low",
    actionUrl: MANAGER_ROUTES.profile,
    sourceEventKey: `attendance_check_out:${profile.employee.id}:${attendanceDate}`,
    createdBy: profile.userId,
  });
}

export async function notifyAttendanceCheckoutUpdated(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  attendanceDate: string,
  workHours: number,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId: profile.employee.id,
    title: "Checkout updated",
    message: `Your checkout for ${attendanceDate} was updated. Working hours: ${formatHoursLabel(workHours)}.`,
    notificationType: "attendance_checkout_updated",
    module: "attendance",
    priority: "low",
    actionUrl: MANAGER_ROUTES.profile,
    sourceEventKey: `attendance_checkout_updated:${profile.employee.id}:${attendanceDate}:${Date.now()}`,
    createdBy: profile.userId,
  });
}

export async function notifyAttendanceRegularizationRequested(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  correctionId: string,
  attendanceDate: string,
  options?: { executiveApplicant?: boolean; ceoEmployeeId?: string | null },
) {
  const executiveApplicant = options?.executiveApplicant ?? false;

  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId: profile.employee.id,
    title: "Regularization requested",
    message: executiveApplicant
      ? `Your attendance regularization for ${attendanceDate} was submitted and is pending CEO approval.`
      : `Your attendance regularization for ${attendanceDate} was submitted for review.`,
    notificationType: "attendance_regularization_requested",
    module: "attendance",
    priority: "medium",
    actionUrl: MANAGER_ROUTES.profile,
    sourceEventKey: `attendance_regularization_requested:${correctionId}`,
    templateKey: "attendance_correction",
    createdBy: profile.userId,
  });

  if (!executiveApplicant) return;

  const ceoIds = await requireActiveCeoApproverEmployeeIds(
    supabase,
    profile.employee.organizationId,
  ).catch(() =>
    options?.ceoEmployeeId ? [options.ceoEmployeeId] : ([] as string[]),
  );

  for (const ceoEmployeeId of ceoIds) {
    await notifyEmployee(supabase, {
      organizationId: profile.employee.organizationId,
      employeeId: ceoEmployeeId,
      title: "Regularization pending CEO approval",
      message: `An HR or Manager attendance regularization for ${attendanceDate} requires your approval.`,
      notificationType: "attendance_regularization_requested",
      module: "attendance",
      priority: "high",
      actionUrl: CEO_ROUTES.approvalsRegularization,
      sourceEventKey: `attendance_regularization_ceo:${correctionId}:${ceoEmployeeId}`,
      templateKey: "attendance_correction",
      createdBy: profile.userId,
    });
  }
}

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
