"use client";

import { format, parseISO } from "date-fns";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  approveTeamLeaveRequestAction,
  fetchTeamLeaveDetailAction,
  rejectTeamLeaveRequestAction,
  requestTeamLeaveInfoAction,
} from "@/lib/manager/actions/manager-leave-actions";
import {
  formatHalfDayPeriod,
  formatLeaveDate,
} from "@/lib/leave/services/leave-utils";
import type { TeamLeaveDetailBundle } from "@/types/manager-leave";
import { cn } from "@/lib/utils";

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

const WORKFLOW_LABELS = {
  pending: "Pending",
  approved_by_manager: "Approved by Manager",
  rejected_by_manager: "Rejected by Manager",
  sent_to_hr: "Sent to HR",
  completed: "Completed",
} as const;

type ManagerLeaveDetailDrawerProps = {
  leaveRequestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete?: () => void;
};

export function ManagerLeaveDetailDrawer({
  leaveRequestId,
  open,
  onOpenChange,
  onActionComplete,
}: ManagerLeaveDetailDrawerProps) {
  const [detail, setDetail] = useState<TeamLeaveDetailBundle | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [actionMode, setActionMode] = useState<"approve" | "reject" | "info" | null>(
    null,
  );
  const [isLoading, startLoading] = useTransition();
  const [isPending, startAction] = useTransition();

  useEffect(() => {
    if (!open || !leaveRequestId) return;
    setDetail(null);
    setApprovalNotes("");
    setInfoMessage("");
    setActionMode(null);
    startLoading(async () => {
      const bundle = await fetchTeamLeaveDetailAction(leaveRequestId);
      setDetail(bundle);
    });
  }, [open, leaveRequestId]);

  function handleApprove() {
    if (!detail) return;
    startAction(async () => {
      const result = await approveTeamLeaveRequestAction({
        leaveRequestId: detail.id,
        comments: approvalNotes.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setActionMode(null);
      setApprovalNotes("");
      onActionComplete?.();
      const refreshed = await fetchTeamLeaveDetailAction(detail.id);
      setDetail(refreshed);
    });
  }

  function handleReject() {
    if (!detail || approvalNotes.trim().length < 3) {
      toast.error("Rejection reason is required.");
      return;
    }
    startAction(async () => {
      const result = await rejectTeamLeaveRequestAction({
        leaveRequestId: detail.id,
        reason: approvalNotes.trim(),
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setActionMode(null);
      setApprovalNotes("");
      onActionComplete?.();
      const refreshed = await fetchTeamLeaveDetailAction(detail.id);
      setDetail(refreshed);
    });
  }

  function handleRequestInfo() {
    if (!detail || infoMessage.trim().length < 3) {
      toast.error("Please enter a message for the employee.");
      return;
    }
    startAction(async () => {
      const result = await requestTeamLeaveInfoAction({
        leaveRequestId: detail.id,
        message: infoMessage.trim(),
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setActionMode(null);
      setInfoMessage("");
      onActionComplete?.();
      const refreshed = await fetchTeamLeaveDetailAction(detail.id);
      setDetail(refreshed);
    });
  }

  const dateRangeLabel =
    detail && detail.startDate === detail.endDate
      ? formatLeaveDate(detail.startDate)
      : detail
        ? `${formatLeaveDate(detail.startDate)} – ${formatLeaveDate(detail.endDate)}`
        : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>
            {detail
              ? `${detail.employeeName} · ${detail.leaveTypeName}`
              : "Leave details"}
          </SheetTitle>
        </SheetHeader>

        {isLoading && !detail ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? (
          <div className="p-6">
            <EmptyState
              title="Leave request not found"
              description="This leave request could not be loaded."
            />
          </div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Employee Profile</h3>
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                <DetailField label="Employee" value={detail.employeeName} />
                <DetailField label="Employee ID" value={detail.employeeCode} />
                <DetailField label="Department" value={detail.departmentName ?? "—"} />
                <DetailField label="Designation" value={detail.designationTitle ?? "—"} />
                <DetailField label="Reporting Manager" value={detail.managerName ?? "—"} />
                {detail.employeeEmail ? (
                  <DetailField label="Email" value={detail.employeeEmail} />
                ) : null}
              </div>
            </section>

            {detail.conflicts.length ? (
              <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                      Leave conflict warnings
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm text-amber-800 dark:text-amber-300">
                      {detail.conflicts.map((conflict) => (
                        <li key={`${conflict.type}-${conflict.message}`}>
                          {conflict.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">Leave Details</h3>
                <LeaveStatusBadge status={detail.leaveStatus} />
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {WORKFLOW_LABELS[detail.workflowStatus]}
                </span>
              </div>
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                <DetailField label="Leave Type" value={detail.leaveTypeName} />
                <DetailField label="Duration" value={dateRangeLabel} />
                <DetailField label="Total Days" value={`${detail.totalDays} day(s)`} />
                <DetailField
                  label="Applied Date"
                  value={format(parseISO(detail.appliedAt), "d MMM yyyy, h:mm a")}
                />
                {detail.isHalfDay ? (
                  <DetailField
                    label="Half Day"
                    value={formatHalfDayPeriod(detail.halfDayPeriod) ?? "Yes"}
                  />
                ) : null}
                <div className="sm:col-span-2">
                  <DetailField label="Reason" value={detail.reason ?? "—"} />
                </div>
                {detail.attachmentPath ? (
                  <div className="sm:col-span-2">
                    <DetailField label="Attachment" value={detail.attachmentPath} />
                  </div>
                ) : null}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Remaining Leave Balance</h3>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Allocated</th>
                      <th className="px-3 py-2 font-medium">Used</th>
                      <th className="px-3 py-2 font-medium">Pending</th>
                      <th className="px-3 py-2 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.balances.length ? (
                      detail.balances.map((balance) => (
                        <tr key={balance.leaveTypeCode} className="border-t">
                          <td className="px-3 py-2">{balance.leaveTypeName}</td>
                          <td className="px-3 py-2 tabular-nums">{balance.allocatedDays}</td>
                          <td className="px-3 py-2 tabular-nums">{balance.usedDays}</td>
                          <td className="px-3 py-2 tabular-nums">{balance.pendingDays}</td>
                          <td className="px-3 py-2 tabular-nums">{balance.balanceDays}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                          No leave balance configured.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Timeline</h3>
              <div className="space-y-3">
                {detail.timeline.map((step, index) => (
                  <div key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "size-2.5 rounded-full",
                          step.status === "completed" && "bg-emerald-500",
                          step.status === "pending" && "bg-amber-500",
                          step.status === "rejected" && "bg-rose-500",
                          step.status === "upcoming" && "bg-muted-foreground/40",
                        )}
                      />
                      {index < detail.timeline.length - 1 ? (
                        <span className="mt-1 w-px flex-1 bg-border" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 pb-3">
                      <p className="text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.actorName}</p>
                      {step.comments ? (
                        <p className="mt-1 text-sm text-muted-foreground">{step.comments}</p>
                      ) : null}
                      {step.actedAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(parseISO(step.actedAt), "d MMM yyyy, h:mm a")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {detail.canApprove || detail.canReject || detail.canRequestInfo ? (
              <section className="space-y-3 rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Manager Actions</h3>
                {!actionMode ? (
                  <div className="flex flex-wrap gap-2">
                    {detail.canApprove ? (
                      <Button size="sm" onClick={() => setActionMode("approve")}>
                        Approve
                      </Button>
                    ) : null}
                    {detail.canReject ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setActionMode("reject")}
                      >
                        Reject
                      </Button>
                    ) : null}
                    {detail.canRequestInfo ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActionMode("info")}
                      >
                        Request More Information
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {actionMode === "info" ? (
                      <>
                        <Label htmlFor="info-message">Message to employee</Label>
                        <Input
                          id="info-message"
                          value={infoMessage}
                          onChange={(event) => setInfoMessage(event.target.value)}
                          placeholder="What additional information do you need?"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" disabled={isPending} onClick={handleRequestInfo}>
                            Send request
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setActionMode(null)}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Label htmlFor="approval-notes">
                          {actionMode === "reject"
                            ? "Rejection reason"
                            : "Approval notes (optional)"}
                        </Label>
                        <Input
                          id="approval-notes"
                          value={approvalNotes}
                          onChange={(event) => setApprovalNotes(event.target.value)}
                          placeholder={
                            actionMode === "reject"
                              ? "Reason for rejection"
                              : "Add approval remarks"
                          }
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={actionMode === "reject" ? "destructive" : "default"}
                            disabled={isPending}
                            onClick={
                              actionMode === "reject" ? handleReject : handleApprove
                            }
                          >
                            {actionMode === "reject" ? "Confirm reject" : "Confirm approve"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setActionMode(null)}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
