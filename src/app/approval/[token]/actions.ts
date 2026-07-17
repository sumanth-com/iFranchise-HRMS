"use server";

import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import { processEmailApproval } from "@/lib/approvals/email-approval-service";
import type { ApprovalDecision, ProcessOutcome } from "@/lib/approvals/types";

export async function submitEmailApprovalAction(input: {
  token: string;
  action: ApprovalDecision;
  reason?: string;
}): Promise<ProcessOutcome> {
  const ctx = await getRequestAuditContext();
  return processEmailApproval({
    rawToken: input.token,
    action: input.action,
    reason: input.reason,
    context: { ip: ctx.ipAddress, userAgent: ctx.userAgent },
  });
}
