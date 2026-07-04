"use client";

import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
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
  const [rejectComments, setRejectComments] = useState("");

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveLeaveRequestAction({
        leaveRequestId: leave.id,
        comments: approveComments || "",
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Leave request approved");
      setApproveOpen(false);
      setApproveComments("");
      router.refresh();
    });
  };

  const handleReject = () => {
    if (rejectComments.trim().length < 3) {
      toast.error("Rejection reason is required");
      return;
    }

    startTransition(async () => {
      const result = await rejectLeaveRequestAction({
        leaveRequestId: leave.id,
        comments: rejectComments,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Leave request rejected");
      setRejectOpen(false);
      setRejectComments("");
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
        onOpenChange={setApproveOpen}
        title="Approve leave request"
        description={`Approve leave for ${leave.employeeName}?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isPending} onClick={handleApprove}>
              Approve
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="approveComments">Comments (optional)</Label>
          <textarea
            id="approveComments"
            rows={3}
            value={approveComments}
            disabled={isPending}
            className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) => setApproveComments(event.currentTarget.value)}
          />
        </div>
      </Modal>

      <Modal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject leave request"
        description={`Reject leave for ${leave.employeeName}?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleReject}>
              Reject
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="rejectComments">Rejection reason</Label>
          <textarea
            id="rejectComments"
            rows={3}
            value={rejectComments}
            disabled={isPending}
            className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) => setRejectComments(event.currentTarget.value)}
          />
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel leave request"
        description={`Cancel leave for ${leave.employeeName}?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep request
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleCancel}>
              Cancel leave
            </Button>
          </>
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
