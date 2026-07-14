"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import {
  approveTeamCorrectionAction,
  approveTeamLeaveAction,
  fetchTeamPendingApprovalsAction,
  rejectTeamCorrectionAction,
  rejectTeamLeaveAction,
} from "@/lib/manager/actions/team-actions";
import type {
  TeamPendingCorrection,
  TeamPendingLeaveApproval,
} from "@/types/manager-team";

type ManagerTeamQuickActionsProps = {
  onRefresh?: () => void;
};

export function ManagerTeamQuickActions({ onRefresh }: ManagerTeamQuickActionsProps) {
  const [leaveApprovals, setLeaveApprovals] = useState<TeamPendingLeaveApproval[]>([]);
  const [corrections, setCorrections] = useState<TeamPendingCorrection[]>([]);
  const [isLoading, startLoading] = useTransition();
  const [isPending, startAction] = useTransition();
  const [rejectLeaveId, setRejectLeaveId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function loadPending() {
    startLoading(async () => {
      const result = await fetchTeamPendingApprovalsAction();
      setLeaveApprovals(result.leaveApprovals);
      setCorrections(result.corrections);
    });
  }

  useEffect(() => {
    loadPending();
  }, []);

  function handleApproveLeave(leaveRequestId: string) {
    startAction(async () => {
      const result = await approveTeamLeaveAction({ leaveRequestId });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        loadPending();
        onRefresh?.();
      }
    });
  }

  function handleRejectLeave() {
    if (!rejectLeaveId || !rejectReason.trim()) return;
    startAction(async () => {
      const result = await rejectTeamLeaveAction({
        leaveRequestId: rejectLeaveId,
        reason: rejectReason.trim(),
      });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        setRejectLeaveId(null);
        setRejectReason("");
        loadPending();
        onRefresh?.();
      }
    });
  }

  function handleCorrection(correctionId: string, approve: boolean) {
    startAction(async () => {
      const action = approve ? approveTeamCorrectionAction : rejectTeamCorrectionAction;
      const result = await action({ correctionId });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        loadPending();
        onRefresh?.();
      }
    });
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Approve Leave</h2>
            <p className="text-xs text-muted-foreground">Pending leave requests from your team.</p>
          </div>
          {isLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>
        {leaveApprovals.length ? (
          <div className="space-y-3">
            {leaveApprovals.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <p className="font-medium">{item.employeeName}</p>
                <p className="text-sm text-muted-foreground">
                  {item.leaveTypeName} · {format(new Date(item.startDate), "d MMM")} –{" "}
                  {format(new Date(item.endDate), "d MMM")} · {item.totalDays} day(s)
                </p>
                {rejectLeaveId === item.leaveRequestId ? (
                  <div className="mt-3 space-y-2">
                    <Input
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Rejection reason"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" disabled={isPending} onClick={handleRejectLeave}>
                        Confirm reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRejectLeaveId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" disabled={isPending} onClick={() => handleApproveLeave(item.leaveRequestId)}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => setRejectLeaveId(item.leaveRequestId)}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No pending leave approvals" description="Your team leave queue is clear." />
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Approve Attendance Regularization</h2>
          <p className="text-xs text-muted-foreground">Pending attendance correction requests.</p>
        </div>
        {corrections.length ? (
          <div className="space-y-3">
            {corrections.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <p className="font-medium">{item.employeeName}</p>
                <p className="text-sm text-muted-foreground">
                  {item.attendanceDate
                    ? format(new Date(item.attendanceDate), "d MMM yyyy")
                    : "Date pending"}{" "}
                  · {item.reason}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" disabled={isPending} onClick={() => handleCorrection(item.id, true)}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleCorrection(item.id, false)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No pending regularizations"
            description="Attendance correction requests will appear here."
          />
        )}
      </div>
    </section>
  );
}
