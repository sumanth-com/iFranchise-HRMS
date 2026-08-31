import {
  renderBrandedEmail,
  renderDetailTable,
  renderEmailButtons,
  renderNote,
  renderParagraph,
} from "@/lib/email/branding";
import type { ApprovalDecision, ApprovalRequestSummary } from "@/lib/approvals/types";

function isLeaveSummary(summary: ApprovalRequestSummary): boolean {
  return Boolean(summary.leaveHighlight) || summary.heading.startsWith("Leave request");
}

/**
 * Forbidden CTA labels that must never appear in leave approval request emails.
 * Matched case-insensitively against the final HTML string.
 */
const FORBIDDEN_LEAVE_EMAIL_ACTIONS = [
  "View Details",
  "View details",
  "view details",
  "View Request",
  "Open HRMS",
  "Review Request",
  "Login to HRMS",
] as const;

/** Default rejection note when leave is rejected from the email one-click flow. */
export const LEAVE_EMAIL_DEFAULT_REJECTION_REASON = "Rejected via email approval";

/**
 * Hard guard: leave approval HTML must never include portal/third CTAs.
 * Throws so a bad template cannot be dispatched.
 */
export function assertLeaveApprovalEmailHtml(html: string): void {
  const normalized = html.replace(/\s+/g, " ");

  for (const phrase of FORBIDDEN_LEAVE_EMAIL_ACTIONS) {
    if (normalized.toLowerCase().includes(phrase.toLowerCase())) {
      const message = `[leave-approval-email] Forbidden action "${phrase}" found in generated HTML`;
      console.error(message);
      throw new Error(message);
    }
  }

  const hasAccept = />(?:\s|&nbsp;)*Accept Leave(?:\s|&nbsp;)*</i.test(html);
  const hasReject = />(?:\s|&nbsp;)*Reject Leave(?:\s|&nbsp;)*</i.test(html);
  if (!hasAccept || !hasReject) {
    const message =
      "[leave-approval-email] Generated HTML must include both Accept Leave and Reject Leave action buttons";
    console.error(message);
    throw new Error(message);
  }

  // Exactly two primary action buttons (accept + reject variants).
  const actionButtonCount = (html.match(/class="email-btn"/g) ?? []).length;
  if (actionButtonCount !== 2) {
    const message = `[leave-approval-email] Expected exactly 2 action buttons, found ${actionButtonCount}`;
    console.error(message);
    throw new Error(message);
  }

  if (process.env.NODE_ENV === "development") {
    console.info(
      "[leave-approval-email] OK: HTML contains Accept Leave + Reject Leave only (no View Details)",
    );
  }
}

/**
 * Leave-only approval request email.
 * Actions are hard-coded to Accept Leave + Reject Leave — no viewUrl / portal CTA params exist.
 */
export function renderLeaveApprovalRequestEmail(params: {
  summary: ApprovalRequestSummary;
  approverName: string;
  approveUrl: string;
  rejectUrl: string;
  expiresInHours: number;
}): string {
  const { summary, approverName, approveUrl, rejectUrl, expiresInHours } = params;

  const reasonNote =
    summary.reason && summary.reason.trim().length > 0
      ? renderNote(
          `<strong style="color:#334155;">Reason:</strong> ${summary.reason.trim()}`,
        )
      : "";

  // Detail rows already include leave fields; drop duplicate Reason row when we
  // show the dedicated reason note so the email stays clean.
  const detailRows = reasonNote
    ? summary.detailRows.filter((row) => row.label.toLowerCase() !== "reason")
    : summary.detailRows;

  const content = `
    ${renderParagraph(`Hello ${approverName || "there"},`)}
    ${renderParagraph(
      `A leave request is awaiting your decision. Review the details below, then accept or reject.`,
    )}
    ${renderDetailTable(detailRows)}
    ${reasonNote}
    ${renderEmailButtons([
      { label: "Accept Leave", href: approveUrl, variant: "approve" },
      { label: "Reject Leave", href: rejectUrl, variant: "reject" },
    ])}
    ${renderNote(
      `This is a secure, single-use link that expires in ${expiresInHours} hours. If you did not expect this email, you can safely ignore it.`,
    )}
  `;

  const html = renderBrandedEmail({
    title: summary.subject,
    preheader: `Leave approval needed for ${summary.employeeName}`,
    heading: "Leave approval required",
    subheading: summary.heading,
    contentHtml: content,
  });

  assertLeaveApprovalEmailHtml(html);
  return html;
}

/**
 * Generic approval request email (non-leave modules).
 * Never includes View Details / portal CTAs.
 */
export function renderApprovalRequestEmail(params: {
  summary: ApprovalRequestSummary;
  approverName: string;
  approveUrl: string;
  rejectUrl: string;
  expiresInHours: number;
}): string {
  const { summary, approverName, approveUrl, rejectUrl, expiresInHours } = params;

  // Leave always uses the dedicated two-button template — no alternate path.
  if (isLeaveSummary(summary)) {
    return renderLeaveApprovalRequestEmail(params);
  }

  const content = `
    ${renderParagraph(`Hello ${approverName || "there"},`)}
    ${renderParagraph(
      `A new request is awaiting your approval. Review the details below and choose an action.`,
    )}
    ${renderDetailTable(summary.detailRows)}
    ${
      summary.reason
        ? renderNote(
            `<strong style="color:#334155;">Reason:</strong> ${summary.reason}`,
          )
        : ""
    }
    ${renderEmailButtons([
      { label: "Approve", href: approveUrl, variant: "approve" },
      { label: "Reject", href: rejectUrl, variant: "reject" },
    ])}
    ${renderNote(
      `This is a secure, single-use link that expires in ${expiresInHours} hours. If you did not expect this email, you can safely ignore it.`,
    )}
  `;

  return renderBrandedEmail({
    title: summary.subject,
    preheader: `${summary.heading} — action required`,
    heading: summary.subject,
    subheading: summary.heading,
    contentHtml: content,
  });
}

export function renderApproverConfirmationEmail(params: {
  decision: ApprovalDecision;
  approverName: string;
  summary: ApprovalRequestSummary;
}): string {
  const { decision, approverName, summary } = params;
  const approved = decision === "approve";
  const leave = isLeaveSummary(summary);
  const verb = approved ? "approved" : "rejected";

  const content = `
    ${renderParagraph(`Hello ${approverName || "there"},`)}
    ${renderParagraph(
      leave
        ? `You have <strong>${verb}</strong> this leave request. No further action is needed.`
        : `You have <strong>${verb}</strong> the following request. No further action is needed.`,
    )}
    ${renderDetailTable(summary.detailRows)}
  `;

  return renderBrandedEmail({
    title: leave
      ? approved
        ? "Leave approved"
        : "Leave rejected"
      : `Request ${verb}`,
    preheader: leave
      ? `You ${verb} leave for ${summary.employeeName}`
      : `You ${verb} ${summary.employeeName}'s request`,
    heading: leave
      ? approved
        ? "Leave approved"
        : "Leave rejected"
      : `Request ${verb}`,
    subheading: "Recorded via secure email approval",
    contentHtml: content,
  });
}

export function renderEmployeeDecisionEmail(params: {
  decision: ApprovalDecision;
  employeeName: string;
  summary: ApprovalRequestSummary;
  reason?: string | null;
}): string {
  const { decision, employeeName, summary, reason } = params;
  const approved = decision === "approve";
  const leave = isLeaveSummary(summary);
  const verb = approved ? "approved" : "rejected";

  const content = `
    ${renderParagraph(`Hello ${employeeName || "there"},`)}
    ${renderParagraph(
      leave
        ? `Your leave request has been <strong>${verb}</strong>.`
        : `Your request has been <strong>${verb}</strong>.`,
    )}
    ${renderDetailTable(summary.detailRows)}
    ${
      !approved && reason
        ? renderNote(
            `<strong style="color:#334155;">Rejection reason:</strong> ${reason}`,
          )
        : ""
    }
  `;

  return renderBrandedEmail({
    title: leave
      ? approved
        ? "Your leave was approved"
        : "Your leave was rejected"
      : `Your request was ${verb}`,
    preheader: leave
      ? `Your leave request was ${verb}`
      : `Your request was ${verb}`,
    heading: leave
      ? approved
        ? "Leave approved"
        : "Leave rejected"
      : approved
        ? "Request approved"
        : "Request rejected",
    subheading: summary.heading,
    contentHtml: content,
  });
}
