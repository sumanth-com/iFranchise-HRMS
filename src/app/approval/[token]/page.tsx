import { redirect } from "next/navigation";

import {
  previewEmailApproval,
  resolveViewDetailPath,
} from "@/lib/approvals/email-approval-service";
import { ApprovalView, type ApprovalViewState } from "@/app/approval/[token]/approval-view";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ action?: string }>;
};

export default async function ApprovalPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { action } = await searchParams;

  if (action === "view") {
    const path = await resolveViewDetailPath(token);
    redirect(path ?? "/login");
  }

  const initialAction: "approve" | "reject" = action === "reject" ? "reject" : "approve";
  const preview = await previewEmailApproval(token);

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
    };
  } else if (preview.status === "expired") {
    state = { kind: "error", tone: "expired", title: "This approval link has expired", message: preview.message };
  } else if (preview.status === "already_processed") {
    state = { kind: "error", tone: "done", title: "Already completed", message: preview.message };
  } else {
    state = { kind: "error", tone: "invalid", title: "Invalid link", message: preview.message };
  }

  return <ApprovalView token={token} initialAction={initialAction} state={state} />;
}
