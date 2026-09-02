"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { LeaveDurationBreakdownCard } from "@/components/leave/leave-apply-policy-panel";
import { Label } from "@/components/ui/label";
import {
  approveLeaveRequestAction,
  decideHrLeaveReviewAction,
  deleteLeaveRequestAction,
  getLeaveDetailAction,
  rejectLeaveRequestAction,
} from "@/lib/leave/actions";
import {
  formatLeaveDate,
} from "@/lib/leave/services/leave-utils";
import type { LeaveDetail, LeaveListItem, LeaveStatus } from "@/types/leave";

type HrLeaveDetailPopupProps = {
  leaveRequestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete?: (result?: {
    leaveRequestId: string;
    status: LeaveListItem["leaveStatus"] | "deleted";
  }) => void;
  canApprove?: boolean;
  canReject?: boolean;
  canDelete?: boolean;
};

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

export function HrLeaveDetailPopup({
  leaveRequestId,
  open,
  onOpenChange,
  onActionComplete,
  canApprove = false,
  canReject = false,
  canDelete = false,
}: HrLeaveDetailPopupProps) {
  const [detail, setDetail] = useState<LeaveDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [actionMode, setActionMode] = useState<
    "approve" | "reject" | "delete" | "lop" | "special" | "hr_reject" | null
  >(null);
  const [comments, setComments] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startAction] = useTransition();

  const pendingApprover =
    detail?.approvals?.find((a) => a.approvalStatus === "pending")?.approverName ?? null;

  useEffect(() => {
    if (!open || !leaveRequestId) {
      setDetail(null);
      setLoadError(null);
      setActionError(null);
      setIsFetching(false);
      return;
    }

    let cancelled = false;

    setLoadError(null);
    setActionError(null);
    setActionMode(null);
    setComments("");
    setDetail(null);
    setIsFetching(true);

    void (async () => {
      try {
        const result = await getLeaveDetailAction(leaveRequestId);
        if (cancelled) return;
        if (!result.success) {
          setLoadError(result.message);
          setDetail(null);
          toast.error(result.message);
          return;
        }
        setDetail(result.data);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to load leave request";
        setLoadError(message);
        setDetail(null);
        toast.error(message);
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, leaveRequestId]);

  function refreshAndClose(
    message: string,
    result?: {
      leaveRequestId: string;
      status: LeaveListItem["leaveStatus"] | "deleted";
    },
  ) {
    toast.success(message);
    setActionMode(null);
    setComments("");
    setActionError(null);
    onOpenChange(false);
    onActionComplete?.(result);
  }

  function handleApprove() {
    if (!detail) return;
    setActionError(null);
    startAction(async () => {
      const result = await approveLeaveRequestAction({
        leaveRequestId: detail.id,
        comments: comments.trim() || "",
      });
      if (!result.success) {
        setActionError(result.message);
        return;
      }
      refreshAndClose("Leave request approved", {
        leaveRequestId: detail.id,
        status: "approved",
      });
    });
  }

  function handleReject() {
    if (!detail) return;
    if (comments.trim().length < 3) {
      setActionError("Rejection reason is required (minimum 3 characters)");
      return;
    }
    setActionError(null);
    startAction(async () => {
      const result = await rejectLeaveRequestAction({
        leaveRequestId: detail.id,
        comments: comments.trim(),
      });
      if (!result.success) {
        setActionError(result.message);
        return;
      }
      refreshAndClose("Leave request rejected", {
        leaveRequestId: detail.id,
        status: "rejected",
      });
    });
  }

  function handleDelete() {
    if (!detail) return;
    setActionError(null);
    startAction(async () => {
      const result = await deleteLeaveRequestAction(detail.id);
      if (!result.success) {
        setActionError(result.message);
        return;
      }
      refreshAndClose("Leave request deleted", {
        leaveRequestId: detail.id,
        status: "deleted",
      });
    });
  }

  function handleHrReview(decision: "lop" | "special" | "reject") {
    if (!detail) return;
    if (decision === "reject" && comments.trim().length < 3) {
      setActionError("Please add a short reason for rejection");
      return;
    }
    setActionError(null);
    startAction(async () => {
      const result = await decideHrLeaveReviewAction({
        leaveRequestId: detail.id,
        decision,
        remarks:
          decision === "reject"
            ? comments.trim()
            : comments.trim() ||
              (decision === "lop" ? "Approved as Loss of Pay" : "Approved as Special Leave"),
      });
      if (!result.success) {
        setActionError(result.message);
        toast.error(result.message);
        return;
      }
      const status = decision === "reject" ? "rejected" : "approved";
      refreshAndClose(
        decision === "reject"
          ? "Leave request rejected"
          : decision === "lop"
            ? "Leave approved as Loss of Pay"
            : "Leave approved as Special Leave",
        { leaveRequestId: detail.id, status },
      );
    });
  }

  const status = detail?.leaveStatus as LeaveStatus | undefined;
  const pendingHrReview =
    Boolean(detail?.hrReviewRequired) && status === "pending" && !detail?.hrDecision;
  const showApprove =
    Boolean(detail?.canApprove ?? canApprove) && status === "pending" && !pendingHrReview;
  const showReject =
    Boolean(detail?.canReject ?? canReject) && status === "pending" && !pendingHrReview;
  const showHrReview =
    pendingHrReview && Boolean(detail?.canApprove ?? canApprove);
  const showDelete = Boolean(detail?.canDelete ?? canDelete);

  const dateRange =
    detail && detail.startDate === detail.endDate
      ? formatLeaveDate(detail.startDate)
      : detail
        ? `${formatLeaveDate(detail.startDate)} – ${formatLeaveDate(detail.endDate)}`
        : "";

  const showInitialSpinner = isFetching && !detail && !loadError;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setActionMode(null);
          setComments("");
          setLoadError(null);
        }
        onOpenChange(next);
      }}
      title={detail ? detail.employeeName : "Leave details"}
      description={
        detail
          ? `${detail.employeeCode} · ${detail.leaveTypeName} · ${dateRange}`
          : loadError
            ? "Could not load this leave request"
            : "Loading leave request…"
      }
      contentClassName="sm:max-w-4xl max-h-none overflow-visible"
      bodyClassName="overflow-visible"
      showCancel={false}
      headerAddon={
        detail ? (
          <LeaveStatusBadge
            status={detail.leaveStatus}
            durationBreakdown={detail.durationBreakdown}
            hrReviewRequired={detail.hrReviewRequired}
            hrDecision={detail.hrDecision}
          />
        ) : null
      }
      footer={
        detail && !actionMode ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {showReject ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setComments("");
                  setActionMode("reject");
                }}
              >
                <XCircle className="size-4" />
                Reject
              </Button>
            ) : null}
            {showApprove ? (
              <Button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setComments("");
                  setActionMode("approve");
                }}
              >
                <CheckCircle2 className="size-4" />
                Accept
              </Button>
            ) : null}
            {showHrReview ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    setComments("");
                    setActionError(null);
                    setActionMode("hr_reject");
                  }}
                >
                  <XCircle className="size-4" />
                  Reject
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleHrReview("special")}
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Approve as Special Leave
                </Button>
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleHrReview("lop")}
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Approve as LOP
                </Button>
              </>
            ) : null}
          </div>
        ) : detail && actionMode ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setActionMode(null);
                setComments("");
              }}
            >
              Back
            </Button>
            {actionMode === "approve" ? (
              <Button type="button" disabled={isPending} onClick={handleApprove}>
                Confirm accept
              </Button>
            ) : null}
            {actionMode === "reject" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleReject}
              >
                Confirm reject
              </Button>
            ) : null}
            {actionMode === "lop" ? (
              <Button type="button" disabled={isPending} onClick={() => handleHrReview("lop")}>
                Confirm approve as LOP
              </Button>
            ) : null}
            {actionMode === "special" ? (
              <Button
                type="button"
                disabled={isPending}
                onClick={() => handleHrReview("special")}
              >
                Confirm special leave
              </Button>
            ) : null}
            {actionMode === "hr_reject" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => handleHrReview("reject")}
              >
                Confirm reject
              </Button>
            ) : null}
            {actionMode === "delete" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleDelete}
              >
                Confirm delete
              </Button>
            ) : null}
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        )
      }
    >
      {showInitialSpinner ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading leave details…
        </div>
      ) : loadError && !detail ? (
        <div className="space-y-3 py-6 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!leaveRequestId) return;
              setLoadError(null);
              setIsFetching(true);
              void getLeaveDetailAction(leaveRequestId).then((result) => {
                setIsFetching(false);
                if (!result.success) {
                  setLoadError(result.message);
                  toast.error(result.message);
                  return;
                }
                setDetail(result.data);
              });
            }}
          >
            Try again
          </Button>
        </div>
      ) : !detail ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Leave request not found.
        </div>
      ) : actionMode === "approve" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Accept this leave request for {detail.employeeName}? Status will show as
            Approved by HR.
          </p>

          {pendingApprover ? (
            <div className="rounded-lg border bg-muted/30 p-2.5 text-xs flex items-center justify-between dark:border-white/10">
              <span className="text-muted-foreground font-medium">Assigned Approver:</span>
              <span className="font-semibold text-primary">{pendingApprover}</span>
            </div>
          ) : null}

          {actionError ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{actionError}</p>
                {pendingApprover ? (
                  <p className="text-red-800 dark:text-red-300">
                    The designated approver for this request is <strong className="font-semibold">{pendingApprover}</strong>.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="hr-leave-approve-note">Note (optional)</Label>
            <textarea
              id="hr-leave-approve-note"
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={comments}
              onChange={(event) => setComments(event.currentTarget.value)}
              placeholder="Optional approval note"
            />
          </div>
        </div>
      ) : actionMode === "lop" || actionMode === "special" || actionMode === "hr_reject" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {actionMode === "lop"
              ? `Approve ${detail.employeeName}'s request as Loss of Pay (LOP). Paid leave balance will not be used.`
              : actionMode === "special"
                ? `Approve ${detail.employeeName}'s request as Special Leave. This will not be treated as LOP or deducted from paid leave.`
                : `Reject ${detail.employeeName}'s leave request.`}
          </p>
          {actionError ? (
            <p className="text-sm text-destructive">{actionError}</p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="hr-leave-review-note">Remarks *</Label>
            <textarea
              id="hr-leave-review-note"
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={comments}
              onChange={(event) => setComments(event.currentTarget.value)}
              placeholder="Add remarks for this decision"
            />
          </div>
        </div>
      ) : actionMode === "reject" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Reject this leave request for {detail.employeeName}? Status will show as
            Rejected by HR.
          </p>

          {pendingApprover ? (
            <div className="rounded-lg border bg-muted/30 p-2.5 text-xs flex items-center justify-between dark:border-white/10">
              <span className="text-muted-foreground font-medium">Assigned Approver:</span>
              <span className="font-semibold text-primary">{pendingApprover}</span>
            </div>
          ) : null}

          {actionError ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{actionError}</p>
                {pendingApprover ? (
                  <p className="text-red-800 dark:text-red-300">
                    The designated approver for this request is <strong className="font-semibold">{pendingApprover}</strong>.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="hr-leave-reject-note">Rejection reason *</Label>
            <textarea
              id="hr-leave-reject-note"
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={comments}
              onChange={(event) => setComments(event.currentTarget.value)}
              placeholder="Enter reason for rejection"
            />
          </div>
        </div>
      ) : actionMode === "delete" ? (
        <div className="space-y-2">
          {actionError ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <p className="font-semibold">{actionError}</p>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Delete leave for {detail.employeeName}? This removes it from Team Leave and
            restores balance when applicable. This cannot be undone.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {loadError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {loadError}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <DetailField
              label="Employee"
              value={`${detail.employeeName} (${detail.employeeCode})`}
            />
            <DetailField label="Employment type" value={detail.employmentTypeName ?? "—"} />
            <DetailField label="Department" value={detail.departmentName ?? "—"} />
            <DetailField label="Leave type" value={detail.leaveTypeName} />
            <DetailField
              label="Available leave balance"
              value={
                detail.availableBalanceAtSubmit == null
                  ? "—"
                  : `${detail.availableBalanceAtSubmit} day${detail.availableBalanceAtSubmit === 1 ? "" : "s"}`
              }
            />
            <DetailField
              label="Duration"
              value={`${detail.totalDays} day${detail.totalDays === 1 ? "" : "s"}`}
            />
            {detail.durationBreakdown ? (
              <div className="sm:col-span-3 rounded-lg border bg-muted/20 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">How this was calculated</p>
                <div className="mt-2">
                  <LeaveDurationBreakdownCard breakdown={detail.durationBreakdown} />
                </div>
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Applied on</p>
                <p className="mt-0.5 text-sm font-medium">
                  {new Date(detail.appliedAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Start date</p>
                <p className="mt-0.5 text-sm font-medium">{formatLeaveDate(detail.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End date</p>
                <p className="mt-0.5 text-sm font-medium">{formatLeaveDate(detail.endDate)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Reason</p>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {detail.reason?.trim() || "—"}
            </p>
          </div>

          {detail.hrRemarks ? (
            <div className="rounded-lg border px-3 py-2.5">
              <p className="text-xs text-muted-foreground">HR remarks</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{detail.hrRemarks}</p>
            </div>
          ) : null}

          {pendingHrReview ? (
            <div className="rounded-lg border px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Approval trail</p>
              <p className="mt-1 text-sm font-medium">CEO approval pending</p>
            </div>
          ) : detail.approvals.length > 0 ? (
            <div className="rounded-lg border px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Approval trail</p>
              <ul className="mt-2 space-y-2">
                {detail.approvals.map((step) => (
                  <li key={step.id} className="text-sm">
                    <span className="font-medium">
                      Level {step.approvalLevel}: {step.approverName || "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {step.approvalStatus}
                      {step.comments ? ` — ${step.comments}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(showApprove || showReject || showHrReview) && (
            <p className="text-xs text-muted-foreground">
              {showHrReview
                ? "Approve as LOP or Special Leave immediately. Reject asks for a short reason. Any CEO can also approve."
                : "Use Accept or Reject below to take action without leaving this page."}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
