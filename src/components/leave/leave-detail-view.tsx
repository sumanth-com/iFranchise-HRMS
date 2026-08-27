"use client";

import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Ban, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { LeaveDurationBreakdownCard } from "@/components/leave/leave-apply-policy-panel";
import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import {
  approveLeaveRequestAction,
  cancelLeaveRequestAction,
  rejectLeaveRequestAction,
} from "@/lib/leave/actions";
import { APPROVAL_LEVEL_LABELS } from "@/lib/leave/constants";
import {
  formatHalfDayPeriod,
  formatLeaveDate,
} from "@/lib/leave/services/leave-utils";
import type { ApprovalStatus, LeaveDetail } from "@/types/leave";
import { cn } from "@/lib/utils";

type LeaveDetailViewProps = {
  leave: LeaveDetail;
};

const APPROVAL_STATUS_STYLES: Record<ApprovalStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-destructive/10 text-destructive",
  skipped: "bg-muted text-muted-foreground",
};

const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  skipped: "Skipped",
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        APPROVAL_STATUS_STYLES[status],
      )}
    >
      {APPROVAL_STATUS_LABELS[status]}
    </span>
  );
}

export function LeaveDetailView({ leave }: LeaveDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [approveComments, setApproveComments] = useState("");
  const [approveError, setApproveError] = useState<string | null>(null);
  const [rejectComments, setRejectComments] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  const pendingApprover =
    leave.approvals.find((a) => a.approvalStatus === "pending")?.approverName ?? null;

  const handleApprove = () => {
    setApproveError(null);
    startTransition(async () => {
      const result = await approveLeaveRequestAction({
        leaveRequestId: leave.id,
        comments: approveComments || "",
      });

      if (!result.success) {
        setApproveError(result.message);
        return;
      }

      toast.success("Leave request approved");
      setApproveOpen(false);
      setApproveComments("");
      setApproveError(null);
      router.refresh();
    });
  };

  const handleReject = () => {
    if (rejectComments.trim().length < 3) {
      setRejectError("Rejection reason is required (minimum 3 characters)");
      return;
    }

    setRejectError(null);
    startTransition(async () => {
      const result = await rejectLeaveRequestAction({
        leaveRequestId: leave.id,
        comments: rejectComments,
      });

      if (!result.success) {
        setRejectError(result.message);
        return;
      }

      toast.success("Leave request rejected");
      setRejectOpen(false);
      setRejectComments("");
      setRejectError(null);
      router.refresh();
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelLeaveRequestAction(leave.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Leave request cancelled");
      setCancelOpen(false);
      router.refresh();
    });
  };

  const dateRangeLabel =
    leave.startDate === leave.endDate
      ? formatLeaveDate(leave.startDate)
      : `${formatLeaveDate(leave.startDate)} – ${formatLeaveDate(leave.endDate)}`;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {leave.employeeName}
              </h1>
              <LeaveStatusBadge status={leave.leaveStatus} />
            </div>
            <p className="text-sm text-muted-foreground">
              {leave.employeeCode} · {leave.leaveTypeName} · {dateRangeLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {leave.canApprove ? (
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => setApproveOpen(true)}
              >
                <CheckCircle2 className="size-4" />
                Approve
              </Button>
            ) : null}
            {leave.canReject ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => setRejectOpen(true)}
              >
                <XCircle className="size-4" />
                Reject
              </Button>
            ) : null}
            {leave.canCancel ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() => setCancelOpen(true)}
              >
                <Ban className="size-4" />
                Cancel
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
          <section className="rounded-xl border p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Employee Information
            </h2>
            <DetailRow label="Employee Code" value={leave.employeeCode} />
            <DetailRow label="Employee Name" value={leave.employeeName} />
            <DetailRow label="Department" value={leave.departmentName ?? "—"} />
            <DetailRow label="Branch" value={leave.branchName ?? "—"} />
          </section>

          <section className="rounded-xl border p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Leave Information
            </h2>
            <DetailRow label="Leave Type" value={leave.leaveTypeName} />
            <DetailRow label="Start Date" value={formatLeaveDate(leave.startDate)} />
            <DetailRow label="End Date" value={formatLeaveDate(leave.endDate)} />
            <DetailRow
              label="Duration"
              value={
                leave.isHalfDay
                  ? `Half day (${formatHalfDayPeriod(leave.halfDayPeriod) ?? "—"})`
                  : `${leave.totalDays} day${leave.totalDays === 1 ? "" : "s"}`
              }
            />
            {leave.durationBreakdown ? (
              <div className="border-b py-3 last:border-b-0">
                <p className="mb-2 text-sm text-muted-foreground">How this was calculated</p>
                <LeaveDurationBreakdownCard breakdown={leave.durationBreakdown} />
              </div>
            ) : null}
            <DetailRow
              label="Status"
              value={<LeaveStatusBadge status={leave.leaveStatus} />}
            />
            <DetailRow label="Reason" value={leave.reason ?? "—"} />
            <DetailRow
              label="Emergency Contact"
              value={
                leave.emergencyContactName
                  ? `${leave.emergencyContactName}${leave.emergencyContactPhone ? ` · ${leave.emergencyContactPhone}` : ""}`
                  : "—"
              }
            />
            <DetailRow
              label="Attachment"
              value={leave.attachmentPath ?? "—"}
            />
            <DetailRow
              label="Applied At"
              value={format(parseISO(leave.appliedAt), "dd MMM yyyy, hh:mm a")}
            />
          </section>
        </div>

        <div className="border-t px-5 py-5 sm:px-6">
          <section className="rounded-xl border p-4">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Approval Timeline
            </h2>
            {leave.approvals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No approval steps configured.
              </p>
            ) : (
              <ol className="space-y-4">
                {leave.approvals.map((step) => (
                  <li
                    key={step.id}
                    className="relative rounded-lg border p-4 pl-5 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:rounded-l-lg before:bg-muted-foreground/20"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {APPROVAL_LEVEL_LABELS[step.approvalLevel] ??
                            `Level ${step.approvalLevel}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {step.approverName}
                        </p>
                        {step.comments ? (
                          <p className="text-sm">{step.comments}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                        <ApprovalStatusBadge status={step.approvalStatus} />
                        {step.actedAt ? (
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(step.actedAt), "dd MMM yyyy, hh:mm a")}
                          </span>
                        ) : null}
                        {step.actedAt &&
                        (step.approvalStatus === "approved" ||
                          step.approvalStatus === "rejected") ? (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            via {step.actedVia === "email" ? "Email" : "Portal"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <Modal
        open={approveOpen}
        onOpenChange={(open) => {
          setApproveOpen(open);
          if (!open) {
            setApproveComments("");
            setApproveError(null);
          }
        }}
        showCancel={false}
        title="Approve leave request"
        description={`Review and approve leave for ${leave.employeeName}?`}
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setApproveOpen(false);
                setApproveComments("");
                setApproveError(null);
              }}
            >
              Cancel
            </Button>
            <Button disabled={isPending} onClick={handleApprove}>
              {isPending ? "Approving…" : "Approve"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {pendingApprover ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Assigned Approver:</span>
                <span className="font-semibold text-primary">{pendingApprover}</span>
              </div>
            </div>
          ) : null}

          {approveError ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{approveError}</p>
                {pendingApprover ? (
                  <p className="text-red-800 dark:text-red-300">
                    The designated approver for this request is <strong className="font-semibold">{pendingApprover}</strong>.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="approveComments">Comments (optional)</Label>
            <textarea
              id="approveComments"
              rows={3}
              value={approveComments}
              disabled={isPending}
              placeholder="Add optional notes for this approval…"
              className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              onChange={(event) => setApproveComments(event.currentTarget.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) {
            setRejectComments("");
            setRejectError(null);
          }
        }}
        showCancel={false}
        title="Reject leave request"
        description={`Review and reject leave for ${leave.employeeName}?`}
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setRejectOpen(false);
                setRejectComments("");
                setRejectError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleReject}>
              {isPending ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {pendingApprover ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Assigned Approver:</span>
                <span className="font-semibold text-primary">{pendingApprover}</span>
              </div>
            </div>
          ) : null}

          {rejectError ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{rejectError}</p>
                {pendingApprover ? (
                  <p className="text-red-800 dark:text-red-300">
                    The designated approver for this request is <strong className="font-semibold">{pendingApprover}</strong>.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="rejectComments">Rejection reason *</Label>
            <textarea
              id="rejectComments"
              rows={3}
              value={rejectComments}
              disabled={isPending}
              placeholder="State the reason for rejecting this leave request…"
              className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              onChange={(event) => setRejectComments(event.currentTarget.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        showCancel={false}
        title="Cancel leave request"
        description={`Cancel leave for ${leave.employeeName}?`}
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep request
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleCancel}>
              Cancel leave
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will cancel the leave request and restore the employee&apos;s leave balance
          where applicable.
        </p>
      </Modal>
    </div>
  );
}
