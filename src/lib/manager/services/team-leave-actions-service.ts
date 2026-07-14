import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { approveLeaveRequest, rejectLeaveRequest } from "@/lib/leave/services/leave-mutations";
import { notifyLeaveInfoRequested } from "@/lib/leave/services/leave-notifications";
import { assertTeamMember } from "@/lib/manager/services/team-queries";
import {
  teamLeaveInfoRequestSchema,
} from "@/lib/validations/manager-leave";
import {
  teamLeaveApprovalSchema,
  teamLeaveRejectSchema,
} from "@/lib/validations/manager-team";
import type { UserProfile } from "@/types/auth";

async function assertManagerCanActOnLeave(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  leaveRequestId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("employee_id, leave_status")
    .eq("id", leaveRequestId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Leave request not found.");
  assertTeamMember(teamIds, data.employee_id);
  if (data.leave_status !== "pending") {
    throw new Error("Only pending leave requests can be actioned.");
  }

  const { data: pendingStep, error: stepError } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .select("id")
    .eq("leave_request_id", leaveRequestId)
    .eq("approver_employee_id", profile.employee.id)
    .eq("approval_status", "pending")
    .is("deleted_at", null)
    .maybeSingle();

  if (stepError) throw new Error(stepError.message);
  if (!pendingStep) {
    throw new Error("You are not the current approver for this request.");
  }

  return data;
}

export async function approveTeamLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = teamLeaveApprovalSchema.parse(input);
  await assertManagerCanActOnLeave(supabase, profile, teamIds, parsed.leaveRequestId);
  await approveLeaveRequest(
    supabase,
    profile,
    parsed.leaveRequestId,
    parsed.comments,
  );
  return { success: true as const, message: "Leave request approved." };
}

export async function rejectTeamLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = teamLeaveRejectSchema.parse(input);
  await assertManagerCanActOnLeave(supabase, profile, teamIds, parsed.leaveRequestId);
  await rejectLeaveRequest(
    supabase,
    profile,
    parsed.leaveRequestId,
    parsed.reason,
  );
  return { success: true as const, message: "Leave request rejected." };
}

export async function requestTeamLeaveInformation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = teamLeaveInfoRequestSchema.parse(input);
  const request = await assertManagerCanActOnLeave(
    supabase,
    profile,
    teamIds,
    parsed.leaveRequestId,
  );

  const { data: approval, error: approvalError } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .select("id")
    .eq("leave_request_id", parsed.leaveRequestId)
    .eq("approver_employee_id", profile.employee.id)
    .eq("approval_status", "pending")
    .is("deleted_at", null)
    .maybeSingle();

  if (approvalError) throw new Error(approvalError.message);
  if (!approval) throw new Error("No pending approval step found.");

  const { error: updateError } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .update({
      comments: parsed.message,
      updated_by: profile.userId,
    })
    .eq("id", approval.id);

  if (updateError) throw new Error(updateError.message);

  await notifyLeaveInfoRequested(
    supabase,
    profile,
    parsed.leaveRequestId,
    request.employee_id,
    parsed.message,
  );

  return { success: true as const, message: "Information request sent to employee." };
}
