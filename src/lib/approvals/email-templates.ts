import {
  renderBrandedEmail,
  renderDetailTable,
  renderEmailButtons,
  renderNote,
  renderParagraph,
} from "@/lib/email/branding";
import type { ApprovalDecision, ApprovalRequestSummary } from "@/lib/approvals/types";

export function renderApprovalRequestEmail(params: {
  summary: ApprovalRequestSummary;
  approverName: string;
  approveUrl: string;
  rejectUrl: string;
  viewUrl: string;
  expiresInHours: number;
}): string {
  const { summary, approverName, approveUrl, rejectUrl, viewUrl, expiresInHours } = params;

  const content = `
    ${renderParagraph(`Hello ${approverName || "there"},`)}
    ${renderParagraph(
      `A new request is awaiting your approval. Review the details below and choose an action.`,
    )}
    ${renderDetailTable(summary.detailRows)}
    ${summary.reason ? renderNote(`<strong style="color:#334155;">Reason:</strong> ${summary.reason}`) : ""}
    ${renderEmailButtons([
      { label: "Approve", href: approveUrl, variant: "approve" },
      { label: "Reject", href: rejectUrl, variant: "reject" },
      { label: "View Details", href: viewUrl, variant: "neutral" },
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
  const verb = decision === "approve" ? "approved" : "rejected";

  const content = `
    ${renderParagraph(`Hello ${approverName || "there"},`)}
    ${renderParagraph(`You have <strong>${verb}</strong> the following request. No further action is needed.`)}
    ${renderDetailTable(summary.detailRows)}
  `;

  return renderBrandedEmail({
    title: `Request ${verb}`,
    preheader: `You ${verb} ${summary.employeeName}'s request`,
    heading: `Request ${verb}`,
    subheading: `Recorded via email approval`,
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
  const verb = approved ? "approved" : "rejected";

  const content = `
    ${renderParagraph(`Hello ${employeeName || "there"},`)}
    ${renderParagraph(`Your request has been <strong>${verb}</strong>.`)}
    ${renderDetailTable(summary.detailRows)}
    ${!approved && reason ? renderNote(`<strong style="color:#334155;">Reason:</strong> ${reason}`) : ""}
  `;

  return renderBrandedEmail({
    title: `Your request was ${verb}`,
    preheader: `Your request was ${verb}`,
    heading: approved ? "Request approved" : "Request rejected",
    subheading: summary.heading,
    contentHtml: content,
  });
}
