"use client";

import { format, parseISO } from "date-fns";
import { CheckCircle2, Forward, Loader2, Paperclip, XCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { CeoLeaveForwardModal } from "@/components/ceo/leave/ceo-leave-forward-modal";
import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  approveCeoLeaveAction,
  fetchCeoLeaveDetailAction,
  rejectCeoLeaveAction,
} from "@/lib/ceo/actions/ceo-leave-actions";
import { APPROVAL_LEVEL_LABELS } from "@/lib/leave/constants";
import {
  formatHalfDayPeriod,
  formatLeaveDate,
} from "@/lib/leave/services/leave-utils";
import type { ApprovalStatus } from "@/types/leave";
import type { CeoForwardTarget, CeoLeaveDetail } from "@/types/ceo-leave";
import { cn } from "@/lib/utils";

type CeoLeaveDetailDrawerProps = {
  leaveRequestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forwardTargets?: CeoForwardTarget[];
  onActed?: () => void;
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/80 px-3 py-2.5">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

export function CeoLeaveDetailDrawer({
  leaveRequestId,
  open,
  onOpenChange,
  forwardTargets = [],
  onActed,
}: CeoLeaveDetailDrawerProps) {
  const [detail, setDetail] = useState<CeoLeaveDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [isActing, startActing] = useTransition();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [approveComments, setApproveComments] = useState("");
  const [rejectComments, setRejectComments] = useState("");

  const loadDetail = () => {
    if (!leaveRequestId) return;
    startLoading(async () => {
      const result = await fetchCeoLeaveDetailAction(leaveRequestId);
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  };

  useEffect(() => {
    if (!open || !leaveRequestId) {
      setDetail(null);
      setError(null);
      setApproveComments("");
      setRejectComments("");
      return;
    }
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leaveRequestId]);

  const handleApprove = () => {
    if (!detail) return;
    startActing(async () => {
      const result = await approveCeoLeaveAction({
        leaveRequestId: detail.id,
        comments: approveComments || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Leave request approved");
      setApproveOpen(false);
      setApproveComments("");
      loadDetail();
      onActed?.();
    });
  };

  const handleReject = () => {
    if (!detail) return;
    if (rejectComments.trim().length < 3) {
      toast.error("Rejection reason is required");
      return;
    }
    startActing(async () => {
      const result = await rejectCeoLeaveAction({
        leaveRequestId: detail.id,
        comments: rejectComments,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Leave request rejected");
      setRejectOpen(false);
      setRejectComments("");
      loadDetail();
      onActed?.();
    });
  };

  const dateRangeLabel = detail
    ? detail.startDate === detail.endDate
      ? formatLeaveDate(detail.startDate)
      : `${formatLeaveDate(detail.startDate)} – ${formatLeaveDate(detail.endDate)}`
    : "";

  const durationLabel = detail
    ? detail.isHalfDay
      ? `Half day (${formatHalfDayPeriod(detail.halfDayPeriod) ?? "—"})`
      : `${detail.totalDays} day${detail.totalDays === 1 ? "" : "s"}`
    : "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>Leave Details</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading leave request…
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-destructive">{error}</p>
          ) : detail ? (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-lg font-semibold">{detail.employeeName}</p>
                      <LeaveStatusBadge status={detail.leaveStatus} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {detail.employeeCode} · {detail.leaveTypeName} · {dateRangeLabel}
                    </p>
                  </div>
                  {detail.canAct ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={isActing}
                        onClick={() => setApproveOpen(true)}
                      >
                        <CheckCircle2 className="size-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isActing}
                        onClick={() => setRejectOpen(true)}
                      >
                        <XCircle className="size-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isActing}
                        onClick={() => setForwardOpen(true)}
                      >
                        <Forward className="size-4" />
                        Forward
                      </Button>
                    </div>
                  ) : null}
                </div>

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Employee Information
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Employee ID" value={detail.employeeCode} />
                    <Field label="Department" value={detail.departmentName} />
                    <Field label="Branch" value={detail.branchName} />
                    <Field label="Leave Type" value={detail.leaveTypeName} />
                    <Field label="Duration" value={durationLabel} />
                    <Field
                      label="Submitted On"
                      value={format(parseISO(detail.appliedAt), "dd MMM yyyy, hh:mm a")}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Reason & Details
                  </h3>
                  <div className="space-y-2">
                    <Field label="Reason" value={detail.reason} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field
                        label="Emergency Contact"
                        value={
                          detail.emergencyContactName
                            ? `${detail.emergencyContactName}${
                                detail.emergencyContactPhone
                                  ? ` · ${detail.emergencyContactPhone}`
                                  : ""
                              }`
                            : null
                        }
                      />
                      <Field
                        label="Attachment"
                        value={
                          detail.attachmentPath ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Paperclip className="size-3.5 text-muted-foreground" />
                              <span className="truncate">{detail.attachmentPath}</span>
                            </span>
                          ) : null
                        }
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border p-4">
                  <h3 className="mb-2 text-sm font-semibold">Leave Balance</h3>
                  {detail.balances.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No leave balances configured.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {detail.balances.map((balance) => (
                        <li
                          key={balance.leaveTypeCode}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span>{balance.leaveTypeName}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {balance.balanceDays} of {balance.allocatedDays} days left
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-xl border p-4">
                  <h3 className="mb-3 text-sm font-semibold">Approval Timeline</h3>
                  {detail.approvals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No approval steps configured.
                    </p>
                  ) : (
                    <ol className="space-y-3">
                      {detail.approvals.map((step) => (
                        <li
                          key={step.id}
                          className="relative rounded-lg border p-3 pl-4 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:rounded-l-lg before:bg-muted-foreground/20"
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
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  APPROVAL_STATUS_STYLES[step.approvalStatus],
                                )}
                              >
                                {APPROVAL_STATUS_LABELS[step.approvalStatus]}
                              </span>
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

                <p className="text-xs text-muted-foreground">
                  Executive access is view-only except for leave requests routed to the CEO
                  for approval.
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Modal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve leave request"
        description={detail ? `Approve leave for ${detail.employeeName}?` : undefined}
        footer={
          <Button disabled={isActing} onClick={handleApprove}>
            Approve
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="ceoApproveComments">Comments (optional)</Label>
          <textarea
            id="ceoApproveComments"
            rows={3}
            value={approveComments}
            disabled={isActing}
            className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) => setApproveComments(event.currentTarget.value)}
          />
        </div>
      </Modal>

      <Modal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject leave request"
        description={detail ? `Reject leave for ${detail.employeeName}?` : undefined}
        footer={
          <Button variant="destructive" disabled={isActing} onClick={handleReject}>
            Reject
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="ceoRejectComments">Rejection reason</Label>
          <textarea
            id="ceoRejectComments"
            rows={3}
            value={rejectComments}
            disabled={isActing}
            className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) => setRejectComments(event.currentTarget.value)}
          />
        </div>
      </Modal>

      <CeoLeaveForwardModal
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        leaveRequestId={detail?.id ?? null}
        employeeName={detail?.employeeName}
        targets={forwardTargets}
        onForwarded={() => {
          setForwardOpen(false);
          loadDetail();
          onActed?.();
        }}
      />
    </>
  );
}
