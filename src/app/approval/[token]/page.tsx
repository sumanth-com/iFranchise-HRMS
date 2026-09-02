import {
  previewEmailApproval,
  processEmailApproval,
} from "@/lib/approvals/email-approval-service";
import { LEAVE_EMAIL_DEFAULT_REJECTION_REASON } from "@/lib/approvals/email-templates";
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

  const initialAction: "approve" | "reject" = action === "reject" ? "reject" : "approve";

  try {
    const preview = await previewEmailApproval(token);

    const isLeave =
      preview.status === "ready"
        ? Boolean(preview.summary.leaveHighlight) ||
          preview.summary.heading.startsWith("Leave request")
        : preview.status === "already_processed"
          ? Boolean(preview.summary?.leaveHighlight) ||
            (preview.summary?.heading.startsWith("Leave request") ?? false)
          : false;

    let initialOutcome: ProcessOutcome | undefined;
    let rejectionReason: string | null = null;

    if (preview.status === "ready" && (initialAction === "approve" || isLeave)) {
      const ctx = await getRequestAuditContext();
      if (initialAction === "reject" && isLeave) {
        rejectionReason = LEAVE_EMAIL_DEFAULT_REJECTION_REASON;
      }
      initialOutcome = await processEmailApproval({
        rawToken: token,
        action: initialAction,
        reason: initialAction === "reject" ? LEAVE_EMAIL_DEFAULT_REJECTION_REASON : undefined,
        context: { ip: ctx.ipAddress, userAgent: ctx.userAgent },
      });
    } else if (preview.status === "already_processed" && preview.summary) {
      initialOutcome = {
        status: "already_processed",
        message: preview.message,
        employeeName: preview.summary.employeeName,
        summary: preview.summary,
      };
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
        initialRejectionReason={rejectionReason}
      />
    );
  } catch (error) {
    console.error("[approval-page]", error);
    return (
      <ApprovalView
        token={token}
        initialAction={initialAction}
        state={{
          kind: "error",
          tone: "invalid",
          title: "We could not open this approval link",
          message:
            "Please try again from the original email, or open the HRMS portal to review the request.",
        }}
      />
    );
  }
}
