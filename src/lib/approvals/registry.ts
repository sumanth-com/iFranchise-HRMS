import { leaveApprovalHandler } from "@/lib/approvals/handlers/leave-approval-handler";
import type { ApprovalHandler, ApprovalRequestType } from "@/lib/approvals/types";

/**
 * Registry of approval handlers by request type. New approval-based modules
 * (attendance regularization, expense claims, etc.) plug in here without
 * changing the shared email workflow.
 */
const HANDLERS: Partial<Record<ApprovalRequestType, ApprovalHandler>> = {
  leave: leaveApprovalHandler,
};

export function getApprovalHandler(type: ApprovalRequestType): ApprovalHandler | null {
  return HANDLERS[type] ?? null;
}
