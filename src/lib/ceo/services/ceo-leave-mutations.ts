import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";

/**
 * Re-dispatches the secure approve/reject email to the request's current
 * pending approver. Dynamic import avoids a static cycle with the approval
 * engine, and it never throws so the mutation is unaffected by email issues.
 */
async function dispatchForwardEmail(leaveRequestId: string, userId?: string | null) {
  try {
    const { dispatchApprovalEmails } = await import(
      "@/lib/approvals/email-approval-service"
    );
    await dispatchApprovalEmails({
      requestType: "leave",
      sourceRecordId: leaveRequestId,
      createdByUserId: userId ?? null,
    });
  } catch (error) {
    console.error("[ceo-leave] forward email dispatch failed", error);
  }
}

/**
 * Forwards a leave request that is currently awaiting the CEO's approval to
 * another approver (a manager or HR). The active pending approval step is
 * reassigned to the target and a fresh approval email is sent to them.
 */
export async function forwardCeoLeaveApproval(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  targetEmployeeId: string,
  note?: string,
): Promise<void> {
  if (targetEmployeeId === profile.employee.id) {
    throw new Error("Select a different approver to forward to");
  }

  const { data: request, error: requestError } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("id, leave_status")
    .eq("id", leaveRequestId)
    .is("deleted_at", null)
    .maybeSingle();

  if (requestError) throw new Error(requestError.message);
  if (!request) throw new Error("Leave request not found");
  if (request.leave_status !== "pending") {
    throw new Error("Only pending requests can be forwarded");
  }

  const { data: approvals, error: approvalsError } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .select("id, approval_level, approver_employee_id, approval_status")
    .eq("leave_request_id", leaveRequestId)
    .eq("approval_status", "pending")
    .is("deleted_at", null)
    .order("approval_level", { ascending: true });

  if (approvalsError) throw new Error(approvalsError.message);

  const activeStep = approvals?.[0];
  if (!activeStep || activeStep.approver_employee_id !== profile.employee.id) {
    throw new Error("You are not authorized to forward this request");
  }

  const { data: target, error: targetError } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, organization_id, deleted_at, employment_status")
    .eq("id", targetEmployeeId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (targetError) throw new Error(targetError.message);
  if (!target) throw new Error("Selected approver was not found");

  const forwardedBy = `${profile.employee.firstName} ${profile.employee.lastName}`.trim();
  const comment =
    note && note.trim().length > 0
      ? note.trim()
      : `Forwarded for approval by ${forwardedBy || "the CEO"}.`;

  const { error: updateError } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .update({
      approver_employee_id: targetEmployeeId,
      comments: comment,
      updated_by: profile.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", activeStep.id);

  if (updateError) throw new Error(updateError.message);

  await dispatchForwardEmail(leaveRequestId, profile.userId);
}
