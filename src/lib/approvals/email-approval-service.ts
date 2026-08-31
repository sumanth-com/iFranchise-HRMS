import { siteConfig } from "@/config/site";
import { loadApproverIdentity } from "@/lib/approvals/approver-identity";
import { approvalActionUrl, getApprovalTokenTtlHours } from "@/lib/approvals/constants";
import {
  assertLeaveApprovalEmailHtml,
  LEAVE_EMAIL_DEFAULT_REJECTION_REASON,
  renderApprovalRequestEmail,
  renderApproverConfirmationEmail,
  renderEmployeeDecisionEmail,
  renderLeaveApprovalRequestEmail,
} from "@/lib/approvals/email-templates";
import { getApprovalHandler } from "@/lib/approvals/registry";
import {
  claimApprovalToken,
  createApprovalToken,
  lookupApprovalToken,
  peekApprovalToken,
  releaseApprovalToken,
} from "@/lib/approvals/token-service";
import type {
  ApprovalDecision,
  ApprovalRequestType,
  PreviewOutcome,
  ProcessOutcome,
} from "@/lib/approvals/types";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { EMPLOYEE_ROUTES as PORTAL_EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { LEAVE_ROUTES, SELF_LEAVE_ROUTES } from "@/lib/leave/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { revalidatePath } from "next/cache";
import { absoluteAppUrl } from "@/lib/url/app-origin";

export type ApprovalRequestContext = {
  ip?: string | null;
  userAgent?: string | null;
};

function admin(): AuthSupabaseClient {
  return createAdminClient() as unknown as AuthSupabaseClient;
}

function absoluteUrl(path: string): string {
  return absoluteAppUrl(path);
}

function alreadyProcessedMessage(requestType: ApprovalRequestType): string {
  return requestType === "leave"
    ? "This leave request has already been processed."
    : "This request has already been completed.";
}

function genericApprovalFailureMessage(): string {
  return "We could not complete this action. Please try again.";
}

/** Keep leave pages in sync after email approve/reject (DB already updated). */
function revalidateAfterEmailDecision(requestType: ApprovalRequestType, sourceRecordId: string) {
  if (requestType !== "leave") return;

  revalidatePath(LEAVE_ROUTES.list);
  revalidatePath(LEAVE_ROUTES.balances);
  revalidatePath(LEAVE_ROUTES.detail(sourceRecordId));
  revalidatePath(SELF_LEAVE_ROUTES.list);
  revalidatePath(SELF_LEAVE_ROUTES.team);
  revalidatePath(PORTAL_EMPLOYEE_ROUTES.leave);
  revalidatePath(MANAGER_ROUTES.leave);
  revalidatePath(MANAGER_ROUTES.leaveTeam);
  revalidatePath(CEO_ROUTES.approvals);
  revalidatePath(CEO_ROUTES.approvalsLeave);
  revalidatePath(SYSTEM_ADMIN_ROUTES.leave);
}

async function fetchApproverName(
  client: AuthSupabaseClient,
  employeeId: string,
): Promise<string> {
  const { data } = await client
    .schema("hrms")
    .from("employees")
    .select("first_name, last_name")
    .eq("id", employeeId)
    .maybeSingle();
  return data ? `${data.first_name} ${data.last_name}`.trim() : "";
}

/**
 * Sends approval-request emails to every approver currently at the active
 * (lowest) pending level for a request. Safe to call repeatedly (e.g. after
 * each level clears) — it only targets the current pending level.
 */
export async function dispatchApprovalEmails(params: {
  requestType: ApprovalRequestType;
  sourceRecordId: string;
  createdByUserId?: string | null;
}): Promise<number> {
  if (!hasSupabaseServiceRoleEnv()) return 0;

  const handler = getApprovalHandler(params.requestType);
  if (!handler) return 0;

  const client = admin();
  const [summary, approvers] = await Promise.all([
    handler.loadSummary(client, params.sourceRecordId),
    handler.getPendingApprovers(client, params.sourceRecordId),
  ]);

  if (!summary || !summary.isPending || approvers.length === 0) return 0;

  let sent = 0;
  for (const approver of approvers) {
    const identity = await loadApproverIdentity(client, approver.employeeId);
    if (!identity?.email) continue;

    const token = await createApprovalToken(client, {
      organizationId: summary.organizationId,
      requestType: handler.type,
      sourceModule: handler.sourceModule,
      sourceRecordId: params.sourceRecordId,
      approvalRecordId: approver.approvalRecordId,
      approverEmployeeId: approver.employeeId,
      approverUserId: identity.userId,
      roleCode: identity.roleCode,
      createdBy: params.createdByUserId ?? null,
    });
    if (!token) continue;

    const html =
      handler.type === "leave"
        ? renderLeaveApprovalRequestEmail({
            summary,
            approverName: identity.name,
            approveUrl: absoluteUrl(approvalActionUrl(token.rawToken, "approve")),
            rejectUrl: absoluteUrl(approvalActionUrl(token.rawToken, "reject")),
            expiresInHours: getApprovalTokenTtlHours(),
          })
        : renderApprovalRequestEmail({
            summary,
            approverName: identity.name,
            approveUrl: absoluteUrl(approvalActionUrl(token.rawToken, "approve")),
            rejectUrl: absoluteUrl(approvalActionUrl(token.rawToken, "reject")),
            expiresInHours: getApprovalTokenTtlHours(),
          });

    // Belt-and-suspenders: never dispatch leave HTML that still contains portal CTAs.
    if (handler.type === "leave") {
      assertLeaveApprovalEmailHtml(html);
    }

    const result = await sendApprovalMail(identity.email, summary.subject, html);

    await writeApplicationAudit(client, {
      organizationId: summary.organizationId,
      module: handler.sourceModule,
      action: "approval_email_sent",
      description: `Approval email sent to ${identity.name} for ${handler.type} request`,
      recordId: params.sourceRecordId,
      priority: "medium",
      eventStatus: result.delivered ? "success" : "failed",
      metadata: {
        approverEmployeeId: approver.employeeId,
        tokenId: token.tokenId,
        delivered: result.delivered,
        skipped: "skipped" in result ? result.skipped : false,
      },
    });

    if (result.delivered) sent += 1;
  }

  return sent;
}

// Lazily import the mailer so client bundles never pull nodemailer in.
async function sendApprovalMail(to: string, subject: string, html: string) {
  const { sendEmail } = await import("@/lib/email/mailer");
  return sendEmail({ to, subject, html });
}

/** Validates a token for the public landing page without consuming it. */
export async function previewEmailApproval(rawToken: string): Promise<PreviewOutcome> {
  if (!hasSupabaseServiceRoleEnv()) {
    return { status: "invalid", message: "Approvals are not configured on this environment." };
  }

  const client = admin();
  const peek = await peekApprovalToken(client, rawToken);

  if (!peek.ok) {
    if (peek.reason === "expired") {
      return { status: "expired", message: "This approval link has expired." };
    }
    if (peek.reason === "consumed") {
      const row = await lookupApprovalToken(client, rawToken);
      return {
        status: "already_processed",
        message: row
          ? alreadyProcessedMessage(row.request_type)
          : "This request has already been completed.",
      };
    }
    return { status: "invalid", message: "This approval link is invalid." };
  }

  const handler = getApprovalHandler(peek.row.request_type);
  if (!handler) return { status: "invalid", message: "This approval link is invalid." };

  const summary = await handler.loadSummary(client, peek.row.source_record_id);
  if (!summary) return { status: "invalid", message: "The request could not be found." };

  if (!summary.isPending) {
    return {
      status: "already_processed",
      message: alreadyProcessedMessage(peek.row.request_type),
      summary,
    };
  }

  const approverName = await fetchApproverName(client, peek.row.approver_employee_id);

  return {
    status: "ready",
    requestType: peek.row.request_type,
    summary,
    approverName,
    detailPath: handler.detailPath(peek.row.source_record_id, peek.row.role_code),
  };
}

/** Resolves the in-portal "View Details" path for a token (allowed even if used). */
export async function resolveViewDetailPath(rawToken: string): Promise<string | null> {
  if (!hasSupabaseServiceRoleEnv()) return null;
  const client = admin();
  const row = await lookupApprovalToken(client, rawToken);
  if (!row) return null;
  const handler = getApprovalHandler(row.request_type);
  if (!handler) return null;
  return handler.detailPath(row.source_record_id, row.role_code);
}

/** Executes an approve/reject decision from an email link. */
export async function processEmailApproval(params: {
  rawToken: string;
  action: ApprovalDecision;
  reason?: string;
  context?: ApprovalRequestContext;
}): Promise<ProcessOutcome> {
  const { rawToken, action } = params;
  const reason = params.reason?.trim();
  const ctx = params.context ?? {};

  if (!hasSupabaseServiceRoleEnv()) {
    return { status: "error", message: "Approvals are not configured on this environment." };
  }

  const client = admin();
  const found = await lookupApprovalToken(client, rawToken);
  if (!found || found.status !== "active") {
    return { status: "invalid", message: "This approval link is invalid." };
  }

  const handler = getApprovalHandler(found.request_type);
  if (!handler) return { status: "invalid", message: "This approval link is invalid." };

  if (new Date(found.expires_at).getTime() <= Date.now()) {
    return { status: "expired", message: "This approval link has expired." };
  }

  if (action === "reject" && (!reason || reason.length < 3)) {
    // Leave email Reject Leave is one-click (no portal / form required).
    if (found.request_type === "leave") {
      // fall through with default reason below
    } else {
      return { status: "error", message: "Please provide a reason for the rejection." };
    }
  }

  const effectiveReason =
    action === "reject"
      ? reason && reason.length >= 3
        ? reason
        : found.request_type === "leave"
          ? LEAVE_EMAIL_DEFAULT_REJECTION_REASON
          : ""
      : undefined;

  if (action === "reject" && (!effectiveReason || effectiveReason.length < 3)) {
    return { status: "error", message: "Please provide a reason for the rejection." };
  }

  const summary = await handler.loadSummary(client, found.source_record_id);
  if (!summary) return { status: "invalid", message: "The request could not be found." };
  if (!summary.isPending) {
    return {
      status: "already_processed",
      message: alreadyProcessedMessage(found.request_type),
    };
  }

  // Atomically claim the token so concurrent clicks cannot double-process.
  const claim = await claimApprovalToken(
    client,
    rawToken,
    action === "approve" ? "approved" : "rejected",
    { ip: ctx.ip, userAgent: ctx.userAgent },
  );
  if (!claim.ok) {
    if (claim.reason === "expired") {
      return { status: "expired", message: "This approval link has expired." };
    }
    return {
      status: "already_processed",
      message: alreadyProcessedMessage(found.request_type),
    };
  }

  await writeApplicationAudit(client, {
    organizationId: found.organization_id,
    module: handler.sourceModule,
    action: action === "approve" ? "approve_clicked" : "reject_clicked",
    description: `${action === "approve" ? "Approve" : "Reject"} clicked from email for ${handler.type} request`,
    recordId: found.source_record_id,
    priority: "medium",
    ipAddress: ctx.ip ?? undefined,
    userAgent: ctx.userAgent ?? undefined,
    metadata: { approverEmployeeId: found.approver_employee_id, tokenId: found.id },
  });

  const identity = await loadApproverIdentity(client, found.approver_employee_id);
  if (!identity) {
    await releaseApprovalToken(client, found.id);
    return { status: "error", message: "We could not verify your account. Please sign in." };
  }

  try {
    if (action === "approve") {
      await handler.approve(client, identity.profile, found.source_record_id);
    } else {
      await handler.reject(client, identity.profile, found.source_record_id, effectiveReason!);
    }
  } catch (error) {
    await releaseApprovalToken(client, found.id);
    const message = error instanceof Error ? error.message : "Something went wrong.";

    await writeApplicationAudit(client, {
      organizationId: found.organization_id,
      module: handler.sourceModule,
      action: action === "approve" ? "approve_failed" : "reject_failed",
      description: `Email ${action} failed: ${message}`,
      recordId: found.source_record_id,
      eventStatus: "failed",
      priority: "high",
      ipAddress: ctx.ip ?? undefined,
      userAgent: ctx.userAgent ?? undefined,
      reason: message,
    });

    if (/not authorized/i.test(message)) {
      return {
        status: "unauthorized",
        message: "You are not authorized to action this request.",
      };
    }
    if (/pending|already processed/i.test(message)) {
      return {
        status: "already_processed",
        message: alreadyProcessedMessage(found.request_type),
      };
    }
    return { status: "error", message: genericApprovalFailureMessage() };
  }

  await handler.markActedViaEmail(client, found.source_record_id, found.approver_employee_id);

  await writeApplicationAudit(client, {
    organizationId: found.organization_id,
    module: handler.sourceModule,
    action: action === "approve" ? "request_approved" : "request_rejected",
    description: `${handler.type} request ${action === "approve" ? "approved" : "rejected"} via email by ${identity.name}`,
    recordId: found.source_record_id,
    priority: action === "approve" ? "medium" : "high",
    ipAddress: ctx.ip ?? undefined,
    userAgent: ctx.userAgent ?? undefined,
    reason: action === "reject" ? effectiveReason : undefined,
    metadata: { approverEmployeeId: found.approver_employee_id, method: "email" },
  });

  const afterSummary = (await handler.loadSummary(client, found.source_record_id)) ?? summary;

  // Confirmation email to the approver.
  if (identity.email) {
    const confirmationHtml = renderApproverConfirmationEmail({
      decision: action,
      approverName: identity.name,
      summary: afterSummary,
    });
    await sendApprovalMail(
      identity.email,
      `Request ${action === "approve" ? "approved" : "rejected"}`,
      confirmationHtml,
    );
  }

  // Notify the employee by email only when the request is finally decided.
  const finallyDecided = action === "reject" || afterSummary.status === "approved";
  if (finallyDecided) {
    const recipient = await handler.decisionRecipient(client, found.source_record_id);
    if (recipient?.email) {
      const decisionHtml = renderEmployeeDecisionEmail({
        decision: action,
        employeeName: recipient.name,
        summary: afterSummary,
        reason: action === "reject" ? effectiveReason : null,
      });
      await sendApprovalMail(
        recipient.email,
        action === "approve" ? "Your request was approved" : "Your request was rejected",
        decisionHtml,
      );
    }
  }

  // Note: multi-level "next approver" emails are dispatched by the module's core
  // approval mutation itself (so portal and email approvals behave identically).

  revalidateAfterEmailDecision(found.request_type, found.source_record_id);

  return {
    status: action === "approve" ? "approved" : "rejected",
    decision: action,
    employeeName: afterSummary.employeeName,
    summary: afterSummary,
  };
}
