import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import {
  getEmployeeReportingManagerId,
  getEmployeeRoleCodes,
} from "@/lib/leave/services/leave-queries";
import { requiresCeoLeaveApproval } from "@/lib/approvals/executive-request-routing";
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
  const applicantRoles = await getEmployeeRoleCodes(supabase, employeeId);
  const executiveApplicant = requiresCeoLeaveApproval(applicantRoles);

  await notifyEmployee(supabase, {
    organizationId,
    employeeId,
    title: "Leave request submitted",
    message: executiveApplicant
      ? "Your leave request has been submitted and is pending CEO approval."
      : "Your leave request has been submitted and is pending HR approval, then CEO approval.",
    notificationType: "leave_submitted",
    module: "leave",
    priority: "medium",
    actionUrl: LEAVE_ROUTES.detail(leaveRequestId),
    sourceEventKey: `leave_submitted:${leaveRequestId}:${employeeId}`,
    templateKey: "leave_submitted",
    createdBy: profile.userId,
  });

  if (executiveApplicant) {
    const { data: pendingApprovals, error } = await supabase
      .schema("hrms")
      .from("leave_approvals")
      .select("approver_employee_id")
      .eq("leave_request_id", leaveRequestId)
      .eq("approval_status", "pending")
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    const notified = new Set<string>();
    for (const row of pendingApprovals ?? []) {
      if (!row.approver_employee_id || notified.has(row.approver_employee_id)) {
        continue;
      }
      notified.add(row.approver_employee_id);
      await notifyEmployee(supabase, {
        organizationId,
        employeeId: row.approver_employee_id,
        title: "Leave request pending CEO approval",
        message:
          "An HR or Manager leave request requires your executive approval.",
        notificationType: "leave_submitted",
        module: "leave",
        priority: "high",
        actionUrl: CEO_ROUTES.approvalsLeave,
        sourceEventKey: `leave_submitted_ceo:${leaveRequestId}:${row.approver_employee_id}`,
        templateKey: "leave_submitted",
        createdBy: profile.userId,
      });
    }
    return;
  }

  const { data: pendingApprovals, error } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .select("approver_employee_id")
    .eq("leave_request_id", leaveRequestId)
    .eq("approval_status", "pending")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const notified = new Set<string>();
  for (const row of pendingApprovals ?? []) {
    if (!row.approver_employee_id || notified.has(row.approver_employee_id)) {
      continue;
    }
    notified.add(row.approver_employee_id);
    await notifyEmployee(supabase, {
      organizationId,
      employeeId: row.approver_employee_id,
      title: "Leave request pending HR approval",
      message: "An employee leave request requires your HR approval.",
      notificationType: "leave_submitted",
      module: "leave",
      priority: "high",
      actionUrl: LEAVE_ROUTES.detail(leaveRequestId),
      sourceEventKey: `leave_submitted_hr:${leaveRequestId}:${row.approver_employee_id}`,
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

export async function notifyLeaveManagerApproved(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId,
    title: "Leave approved by manager",
    message:
      "Your manager has approved your leave request. It is now pending HR review.",
    notificationType: "leave_manager_approved",
    module: "leave",
    priority: "medium",
    actionUrl: LEAVE_ROUTES.detail(leaveRequestId),
    sourceEventKey: `leave_manager_approved:${leaveRequestId}:${employeeId}`,
    templateKey: "leave_manager_approved",
    createdBy: profile.userId,
  });
}

export async function notifyLeaveInfoRequested(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
  message: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId,
    title: "More information requested for leave",
    message,
    notificationType: "leave_info_requested",
    module: "leave",
    priority: "high",
    actionUrl: LEAVE_ROUTES.detail(leaveRequestId),
    sourceEventKey: `leave_info_requested:${leaveRequestId}:${employeeId}`,
    templateKey: "leave_info_requested",
    createdBy: profile.userId,
  });
}

export async function notifyLeaveCancelled(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
  managerId: string | null,
) {
  if (managerId && managerId !== employeeId) {
    await notifyEmployee(supabase, {
      organizationId: profile.employee.organizationId,
      employeeId: managerId,
      title: "Team leave cancelled",
      message: "A team member has cancelled a leave request.",
      notificationType: "leave_cancelled",
      module: "leave",
      priority: "medium",
      actionUrl: MANAGER_ROUTES.leaveDetail(leaveRequestId),
      sourceEventKey: `leave_cancelled_manager:${leaveRequestId}:${managerId}`,
      templateKey: "leave_cancelled",
      createdBy: profile.userId,
    });
  }
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
