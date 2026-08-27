"use client";

import { format, parseISO } from "date-fns";
import { CheckCircle2, Eye, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { LeavePanel } from "@/components/ceo/leave/ceo-leave-tables";
import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import {
  approveCeoLeaveAction,
  rejectCeoLeaveAction,
} from "@/lib/ceo/actions/ceo-leave-actions";
import { broadcastApprovalChange } from "@/lib/approvals/use-approvals-sync";
import { leaveApprovalStageLabel } from "@/lib/leave/constants";
import { formatHalfDayPeriod } from "@/lib/leave/services/leave-utils";
import type { CeoApprovalQueueItem } from "@/types/ceo-leave";

type CeoLeaveApprovalQueueProps = {
  items: CeoApprovalQueueItem[];
  isLoading?: boolean;
  onView: (id: string) => void;
  onActed: (item?: CeoApprovalQueueItem, status?: "approved" | "rejected") => void;
};

function durationLabel(item: CeoApprovalQueueItem) {
  if (item.isHalfDay) {
    return `Half day${
      formatHalfDayPeriod(item.halfDayPeriod)
        ? ` · ${formatHalfDayPeriod(item.halfDayPeriod)}`
        : ""
    }`;
  }
  return `${item.totalDays} day${item.totalDays === 1 ? "" : "s"}`;
}

function dateRangeLabel(item: CeoApprovalQueueItem) {
  if (item.startDate === item.endDate) {
    return format(parseISO(item.startDate), "dd MMM yyyy");
  }
  return `${format(parseISO(item.startDate), "dd MMM yyyy")} – ${format(parseISO(item.endDate), "dd MMM yyyy")}`;
}

export function CeoLeaveApprovalQueue({
  items,
  isLoading,
  onView,
  onActed,
}: CeoLeaveApprovalQueueProps) {
  const [target, setTarget] = useState<{
    item: CeoApprovalQueueItem;
    type: "approve" | "reject";
  } | null>(null);
  const [rejectComments, setRejectComments] = useState("");
  const [isActing, startActing] = useTransition();

  const closeModal = () => {
    setTarget(null);
    setRejectComments("");
  };

  const handleApprove = () => {
    if (!target) return;
    const item = target.item;
    startActing(async () => {
      const result = await approveCeoLeaveAction({
        leaveRequestId: item.id,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Leave request approved");
      closeModal();
      broadcastApprovalChange("leave");
      onActed(item, "approved");
    });
  };

  const handleReject = () => {
    if (!target) return;
    const item = target.item;
    if (rejectComments.trim().length < 3) {
      toast.error("Rejection reason is required");
      return;
    }
    startActing(async () => {
      const result = await rejectCeoLeaveAction({
        leaveRequestId: item.id,
        comments: rejectComments,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Leave request rejected");
      closeModal();
      broadcastApprovalChange("leave");
      onActed(item, "rejected");
    });
  };

  const columns: DataTableColumn<CeoApprovalQueueItem>[] = [
    {
      key: "requestCategoryLabel",
      header: "Request Type",
      render: (row) => (
        <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
          {row.requestCategoryLabel}
        </span>
      ),
    },
    {
      key: "employeeName",
      header: "Employee",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.employeeName}</p>
          <p className="truncate text-xs text-muted-foreground">{row.employeeCode}</p>
        </div>
      ),
    },
    {
      key: "departmentName",
      header: "Department",
      render: (row) => row.departmentName ?? "—",
    },
    {
      key: "leaveTypeName",
      header: "Leave Type",
      render: (row) => row.leaveTypeName || "—",
    },
    {
      key: "submittedAt",
      header: "Submitted",
      render: (row) => (
        <span className="whitespace-nowrap">
          {format(parseISO(row.submittedAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (row) => durationLabel(row),
    },
    {
      key: "stage",
      header: "Current Stage",
      render: () => (
        <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
          {leaveApprovalStageLabel(null, { awaitingCeo: true })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            className="h-7 gap-1 px-2"
            disabled={isActing}
            onClick={() => setTarget({ item: row, type: "approve" })}
          >
            <CheckCircle2 className="size-3.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2"
            disabled={isActing}
            onClick={() => setTarget({ item: row, type: "reject" })}
          >
            <XCircle className="size-3.5" />
            Reject
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="View details"
            disabled={isActing}
            onClick={() => onView(row.id)}
          >
            <Eye className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <LeavePanel
      title="CEO Approval Queue"
      description="Leave requests from HR and Manager users routed for executive approval. Employee requests only appear here when assigned to you."
      count={items.length}
    >
      <DataTable
        columns={columns}
        data={items}
        emptyMessage={
          isLoading ? "Loading…" : "No leave requests are awaiting your approval."
        }
      />

      <Modal
        open={target?.type === "approve"}
        onOpenChange={(open) => (open ? undefined : closeModal())}
        title="Confirm approval"
        description={
          target
            ? `Approve ${target.item.leaveTypeName || "leave"} for ${target.item.employeeName}? This will mark the request as approved.`
            : undefined
        }
        footer={
          <Button disabled={isActing} onClick={handleApprove}>
            Confirm & Approve
          </Button>
        }
      >
        {target ? (
          <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm">
            <p>
              <span className="text-muted-foreground">Employee: </span>
              {target.item.employeeName}
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Leave: </span>
              {target.item.leaveTypeName || "—"} · {durationLabel(target.item)}
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Dates: </span>
              {dateRangeLabel(target.item)}
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={target?.type === "reject"}
        onOpenChange={(open) => (open ? undefined : closeModal())}
        title="Reject leave request"
        description={target ? `Reject leave for ${target.item.employeeName}?` : undefined}
        footer={
          <Button variant="destructive" disabled={isActing} onClick={handleReject}>
            Reject
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="queueRejectComments">Rejection reason</Label>
          <textarea
            id="queueRejectComments"
            rows={3}
            value={rejectComments}
            disabled={isActing}
            className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) => setRejectComments(event.currentTarget.value)}
          />
        </div>
      </Modal>
    </LeavePanel>
  );
}
