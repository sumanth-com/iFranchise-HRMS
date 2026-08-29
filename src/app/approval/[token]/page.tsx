import {
  previewEmailApproval,
  processEmailApproval,
} from "@/lib/approvals/email-approval-service";
import { ApprovalView, type ApprovalViewState } from "@/app/approval/[token]/approval-view";
import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import type { ProcessOutcome } from "@/lib/approvals/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ action?: string }>;
};

export default async function ApprovalPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { action } = await searchParams;

  // Email links only use approve | reject. Ignore legacy "view" and treat as approve.
  const initialAction: "approve" | "reject" = action === "reject" ? "reject" : "approve";
  const preview = await previewEmailApproval(token);

  let initialOutcome: ProcessOutcome | undefined;
  if (initialAction === "approve" && preview.status === "ready") {
    const ctx = await getRequestAuditContext();
    initialOutcome = await processEmailApproval({
      rawToken: token,
      action: "approve",
      context: { ip: ctx.ipAddress, userAgent: ctx.userAgent },
    });
  }

  let state: ApprovalViewState;
  if (preview.status === "ready") {
    state = {
      kind: "ready",
      subject: preview.summary.subject,
      heading: preview.summary.heading,
      employeeName: preview.summary.employeeName,
      approverName: preview.approverName,
      detailRows: preview.summary.detailRows,
      reason: preview.summary.reason,
      leaveHighlight: preview.summary.leaveHighlight,
    };
  } else if (preview.status === "expired") {
    state = {
      kind: "error",
      tone: "expired",
      title: "This approval link has expired",
      message: preview.message,
    };
  } else if (preview.status === "already_processed") {
    const isLeave =
      Boolean(preview.summary?.leaveHighlight) ||
      (preview.summary?.heading.startsWith("Leave request") ?? false);
    state = {
      kind: "error",
      tone: "done",
      title: isLeave ? "Already processed" : "Already completed",
      message: preview.message,
    };
  } else {
    state = {
      kind: "error",
      tone: "invalid",
      title: "Invalid link",
      message: preview.message,
    };
  }

  return (
    <ApprovalView
      token={token}
      initialAction={initialAction}
      state={state}
      initialOutcome={initialOutcome}
    />
  );
}
