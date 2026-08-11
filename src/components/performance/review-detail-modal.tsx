"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/common/modal";
import { PerformanceConfirmModal } from "@/components/performance/performance-confirm-modal";
import {
  ReviewStageBadge,
  ReviewStatusBadge,
} from "@/components/performance/performance-status-badge";
import {
  DetailField,
  DetailGrid,
  PerformanceSection,
} from "@/components/performance/performance-ui-primitives";
import { approveReviewAction, fetchReviewDetailAction } from "@/lib/performance/actions";
import { RATING_LABELS, REVIEW_STAGE_LABELS } from "@/lib/performance/constants";
import type { ReviewDetail } from "@/types/performance";

type Props = {
  reviewId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canApprove?: boolean;
};

export function ReviewDetailModal({
  reviewId,
  open,
  onOpenChange,
  canApprove = false,
}: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !reviewId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchReviewDetailAction(reviewId).then((data) => {
      if (cancelled) return;
      setDetail(data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, reviewId]);

  const pendingApproval = detail?.approvals.find((a) => a.approvalStatus === "pending");
  const canApproveNow =
    canApprove &&
    detail &&
    ["pending", "in_progress", "submitted"].includes(detail.reviewStatus) &&
    pendingApproval;

  function refresh() {
    if (!reviewId) return;
    fetchReviewDetailAction(reviewId).then(setDetail);
    router.refresh();
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={detail ? `${detail.employeeName} — Review` : "Review details"}
        description={detail?.cycleName ?? "Performance review"}
        contentClassName="sm:max-w-2xl"
        showCancel={false}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {canApproveNow ? (
              <Button onClick={() => setApproveOpen(true)}>Approve step</Button>
            ) : null}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading review…
          </div>
        ) : !detail ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Review not found.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <ReviewStageBadge stage={detail.reviewStage} />
              <ReviewStatusBadge status={detail.reviewStatus} />
            </div>

            {detail.overallRating ? (
              <p className="text-lg font-semibold">
                {detail.overallRating}/5 — {RATING_LABELS[detail.overallRating]}
              </p>
            ) : null}

            <PerformanceSection title="Employee">
              <DetailGrid>
                <DetailField label="Employee" value={detail.employeeName} />
                <DetailField label="Department" value={detail.departmentName ?? "—"} />
                <DetailField label="Cycle" value={detail.cycleName ?? "—"} />
                <DetailField
                  label="Submitted"
                  value={
                    detail.submittedAt
                      ? format(new Date(detail.submittedAt), "MMM d, yyyy")
                      : "—"
                  }
                />
              </DetailGrid>
            </PerformanceSection>

            <DetailGrid columns={1}>
              <DetailField label="Strengths" value={detail.strengths ?? "—"} />
              <DetailField label="Weaknesses" value={detail.weaknesses ?? "—"} />
              <DetailField label="Improvement plan" value={detail.improvementPlan ?? "—"} />
              <DetailField label="Comments" value={detail.comments ?? "—"} />
            </DetailGrid>

            <PerformanceSection
              title="Approval workflow"
              description="Track each review stage and who needs to act next."
            >
              <div className="space-y-2">
                {detail.approvals.map((approval) => (
                  <div
                    key={approval.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {REVIEW_STAGE_LABELS[approval.reviewStage]}
                      </p>
                      <p className="text-xs text-muted-foreground">{approval.approverName}</p>
                      {approval.comments ? (
                        <p className="mt-1 text-xs text-muted-foreground">{approval.comments}</p>
                      ) : null}
                    </div>
                    <ReviewStatusBadge
                      status={
                        approval.approvalStatus === "approved"
                          ? "approved"
                          : approval.approvalStatus === "rejected"
                            ? "rejected"
                            : "pending"
                      }
                    />
                  </div>
                ))}
              </div>
              {pendingApproval ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Next action: {REVIEW_STAGE_LABELS[pendingApproval.reviewStage]} approval by{" "}
                  {pendingApproval.approverName}.
                </p>
              ) : null}
            </PerformanceSection>
          </div>
        )}
      </Modal>

      <PerformanceConfirmModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Confirm approval"
        description="Approve the current review stage and advance the workflow."
        confirmLabel="Confirm approval"
        isPending={isPending}
        onConfirm={() => {
          if (!detail) return;
          startTransition(async () => {
            const result = await approveReviewAction({
              reviewId: detail.id,
              comments: approveComment.trim() || undefined,
            });
            if (!result.success) toast.error(result.message);
            else {
              toast.success("Review step approved");
              setApproveOpen(false);
              setApproveComment("");
              refresh();
            }
          });
        }}
      >
        {pendingApproval ? (
          <>
            <p>
              Stage: <strong>{REVIEW_STAGE_LABELS[pendingApproval.reviewStage]}</strong>
            </p>
            <p>Approver: {pendingApproval.approverName}</p>
          </>
        ) : null}
        <div className="space-y-1.5 pt-2">
          <Label className="text-xs">Optional comment</Label>
          <Input
            value={approveComment}
            disabled={isPending}
            onChange={(e) => setApproveComment(e.target.value)}
            placeholder="Approval notes…"
          />
        </div>
      </PerformanceConfirmModal>
    </>
  );
}
