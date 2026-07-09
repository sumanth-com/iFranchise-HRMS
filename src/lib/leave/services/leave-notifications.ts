import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import { getEmployeeReportingManagerId } from "@/lib/leave/services/leave-queries";
import {
  notifyEmployee,
} from "@/lib/notifications/services/notification-service";

export async function notifyLeaveSubmitted(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
) {
  const organizationId = profile.employee.organizationId;

  await notifyEmployee(supabase, {
    organizationId,
    employeeId,
    title: "Leave request submitted",
    message: "Your leave request has been submitted and is pending approval.",
    notificationType: "leave_submitted",
    module: "leave",
    priority: "medium",
    actionUrl: LEAVE_ROUTES.detail(leaveRequestId),
    sourceEventKey: `leave_submitted:${leaveRequestId}:${employeeId}`,
    templateKey: "leave_submitted",
    createdBy: profile.userId,
  });

  const managerId = await getEmployeeReportingManagerId(supabase, employeeId);
  if (managerId && managerId !== employeeId) {
    await notifyEmployee(supabase, {
      organizationId,
      employeeId: managerId,
      title: "Leave request pending approval",
      message: "A team member has submitted a leave request awaiting your approval.",
      notificationType: "leave_submitted",
      module: "leave",
      priority: "high",
      actionUrl: LEAVE_ROUTES.detail(leaveRequestId),
      sourceEventKey: `leave_submitted_manager:${leaveRequestId}:${managerId}`,
      templateKey: "leave_submitted",
      createdBy: profile.userId,
    });
  }
}

export async function notifyLeaveApproved(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId,
    title: "Leave request approved",
    message: "Your leave request has been approved.",
    notificationType: "leave_approved",
    module: "leave",
    priority: "medium",
    actionUrl: LEAVE_ROUTES.detail(leaveRequestId),
    sourceEventKey: `leave_approved:${leaveRequestId}:${employeeId}`,
    templateKey: "leave_approved",
    createdBy: profile.userId,
  });
}

export async function notifyLeaveRejected(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId,
    title: "Leave request rejected",
    message: "Your leave request has been rejected.",
    notificationType: "leave_rejected",
    module: "leave",
    priority: "high",
    actionUrl: LEAVE_ROUTES.detail(leaveRequestId),
    sourceEventKey: `leave_rejected:${leaveRequestId}:${employeeId}`,
    templateKey: "leave_rejected",
    createdBy: profile.userId,
  });
}
