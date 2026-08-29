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

export function renderApprovalRequestEmail(params: {
  summary: ApprovalRequestSummary;
  approverName: string;
  approveUrl: string;
  rejectUrl: string;
  expiresInHours: number;
}): string {
  const { summary, approverName, approveUrl, rejectUrl, expiresInHours } = params;
  const leave = isLeaveSummary(summary);

  const intro = leave
    ? `A leave request is awaiting your approval. Review the details below, then approve or reject.`
    : `A new request is awaiting your approval. Review the details below and choose an action.`;

  const content = `
    ${renderParagraph(`Hello ${approverName || "there"},`)}
    ${renderParagraph(intro)}
    ${renderDetailTable(summary.detailRows)}
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
    preheader: leave
      ? `Leave approval needed for ${summary.employeeName}`
      : `${summary.heading} — action required`,
    heading: leave ? "Leave approval required" : summary.subject,
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
    ${!approved && reason ? renderNote(`<strong style="color:#334155;">Rejection reason:</strong> ${reason}`) : ""}
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
