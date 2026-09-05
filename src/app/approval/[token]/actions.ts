"use server";

import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import { processEmailApproval } from "@/lib/approvals/email-approval-service";
import type { ApprovalDecision, ProcessOutcome } from "@/lib/approvals/types";

export async function submitEmailApprovalAction(input: {
  token: string;
  action: ApprovalDecision;
  reason?: string;
}): Promise<ProcessOutcome> {
  try {
    const token = String(input.token ?? "").trim();
    if (!token || token.length < 16) {
      return {
        status: "invalid",
        message: "This approval link is invalid or no longer available.",
      };
    }
    if (input.action !== "approve" && input.action !== "reject") {
      return {
        status: "invalid",
        message: "This approval link is invalid or no longer available.",
      };
    }

    const ctx = await getRequestAuditContext();
    return await processEmailApproval({
      rawToken: token,
      action: input.action,
      reason: input.reason,
      context: { ip: ctx.ipAddress, userAgent: ctx.userAgent },
    });
  } catch (error) {
    console.error("[approval-action]", error);
    return {
      status: "error",
      message: "We could not complete this action. Please try again.",
    };
  }
}
