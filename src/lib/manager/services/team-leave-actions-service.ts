import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { notifyLeaveInfoRequested } from "@/lib/leave/services/leave-notifications";
import { assertTeamMember } from "@/lib/manager/services/team-queries";
import { teamLeaveInfoRequestSchema } from "@/lib/validations/manager-leave";
import {
  teamLeaveApprovalSchema,
  teamLeaveRejectSchema,
} from "@/lib/validations/manager-team";
import type { UserProfile } from "@/types/auth";

export async function approveTeamLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = teamLeaveApprovalSchema.parse(input);

  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("employee_id")
    .eq("id", parsed.leaveRequestId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Leave request not found.");
  assertTeamMember(teamIds, data.employee_id);

  const { approveLeaveRequest } = await import("@/lib/leave/services/leave-mutations");
  await approveLeaveRequest(supabase, profile, parsed.leaveRequestId, parsed.comments);
  return { success: true as const, message: "Leave request approved." };
}

export async function rejectTeamLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = teamLeaveRejectSchema.parse(input);

  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("employee_id")
    .eq("id", parsed.leaveRequestId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Leave request not found.");
  assertTeamMember(teamIds, data.employee_id);

  const { rejectLeaveRequest } = await import("@/lib/leave/services/leave-mutations");
  await rejectLeaveRequest(supabase, profile, parsed.leaveRequestId, parsed.reason);
  return { success: true as const, message: "Leave request rejected." };
}

export async function requestTeamLeaveInformation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
) {
  const parsed = teamLeaveInfoRequestSchema.parse(input);

  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("employee_id, leave_status")
    .eq("id", parsed.leaveRequestId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Leave request not found.");
  assertTeamMember(teamIds, data.employee_id);

  await notifyLeaveInfoRequested(
    supabase,
    profile,
    parsed.leaveRequestId,
    data.employee_id,
    parsed.message,
  );

  return { success: true as const, message: "Information request sent to the employee." };
}
