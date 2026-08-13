import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { notifyLeaveInfoRequested } from "@/lib/leave/services/leave-notifications";
import { assertTeamMember } from "@/lib/manager/services/team-queries";
import { teamLeaveInfoRequestSchema } from "@/lib/validations/manager-leave";
import type { UserProfile } from "@/types/auth";

export async function approveTeamLeaveRequest(
  _supabase: AuthSupabaseClient,
  _profile: UserProfile,
  _teamIds: string[],
  _input: unknown,
) {
  throw new Error("Only HR can approve leave requests.");
}

export async function rejectTeamLeaveRequest(
  _supabase: AuthSupabaseClient,
  _profile: UserProfile,
  _teamIds: string[],
  _input: unknown,
) {
  throw new Error("Only HR can reject leave requests.");
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
