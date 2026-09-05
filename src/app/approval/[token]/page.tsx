import { previewEmailApproval } from "@/lib/approvals/email-approval-service";
import { ApprovalView, type ApprovalViewState } from "@/app/approval/[token]/approval-view";

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
        title: "This approval link has expired.",
        message: preview.message,
      };
    } else if (preview.status === "already_processed") {
      // Show the final leave result screen when we still have summary data.
      if (isLeave && preview.summary) {
        const approved = preview.summary.status === "approved";
        return (
          <ApprovalView
            token={token}
            initialAction={initialAction}
            state={{
              kind: "error",
              tone: "done",
              title: approved ? "Leave Request Approved Successfully" : "Leave Request Rejected",
              message: preview.message,
            }}
            initialOutcome={{
              status: approved ? "approved" : "rejected",
              decision: approved ? "approve" : "reject",
              employeeName: preview.summary.employeeName,
              summary: preview.summary,
            }}
          />
        );
      }
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
        title: "This approval link is invalid or no longer available.",
        message: preview.message,
      };
    }

    return (
      <ApprovalView
        token={token}
        initialAction={initialAction}
        state={state}
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
