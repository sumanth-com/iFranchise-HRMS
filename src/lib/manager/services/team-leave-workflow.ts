import type { LeaveStatus } from "@/types/leave";
import type { ManagerLeaveWorkflowStatus } from "@/types/manager-leave";

/**
 * Manager Team Leave workflow badge.
 * Employee leave uses first-wins: any authorized accept (manager / HR / CEO)
 * finalizes `leave_status`, so intermediate "sent_to_hr" is not a stable state.
 * Level 1 = HR + reporting manager; level 2 = CEO.
 */
export function resolveManagerLeaveWorkflowStatus(
  leaveStatus: LeaveStatus,
  approvals: Array<{ approvalLevel: number; approvalStatus: string }>,
): ManagerLeaveWorkflowStatus {
  void approvals; // Call-site compatibility; first-wins finalizes leave_status directly.
  if (leaveStatus === "approved") return "completed";
  if (leaveStatus === "rejected") return "rejected_by_manager";
  return "pending";
}
