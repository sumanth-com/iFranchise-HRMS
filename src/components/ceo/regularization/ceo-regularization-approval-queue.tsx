"use client";

import { format, parseISO } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { LeavePanel } from "@/components/ceo/leave/ceo-leave-tables";
import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import {
  approveCeoRegularizationAction,
  rejectCeoRegularizationAction,
} from "@/lib/ceo/actions/ceo-regularization-actions";
import { broadcastApprovalChange } from "@/lib/approvals/use-approvals-sync";
import type { CeoRegularizationQueueItem } from "@/types/ceo-regularization";

type CeoRegularizationApprovalQueueProps = {
  items: CeoRegularizationQueueItem[];
  isLoading?: boolean;
  onActed: (item?: CeoRegularizationQueueItem, status?: "approved" | "rejected") => void;
};

function formatTime(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "hh:mm a");
  } catch {
    return value;
  }
}

export function CeoRegularizationApprovalQueue({
  items,
  isLoading,
  onActed,
}: CeoRegularizationApprovalQueueProps) {
  const [target, setTarget] = useState<{
    item: CeoRegularizationQueueItem;
    type: "approve" | "reject";
  } | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [isActing, startActing] = useTransition();

  const closeModal = () => {
    setTarget(null);
    setRejectNotes("");
  };

  const handleApprove = () => {
    if (!target) return;
    const item = target.item;
    startActing(async () => {
      const result = await approveCeoRegularizationAction({
        correctionId: item.id,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Regularization approved");
      closeModal();
      broadcastApprovalChange("regularization");
      onActed(item, "approved");
    });
  };

  const handleReject = () => {
    if (!target) return;
    const item = target.item;
    startActing(async () => {
      const result = await rejectCeoRegularizationAction({
        correctionId: item.id,
        reviewNotes: rejectNotes.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Regularization rejected");
      closeModal();
      broadcastApprovalChange("regularization");
      onActed(item, "rejected");
    });
  };

  const columns: DataTableColumn<CeoRegularizationQueueItem>[] = [
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
      key: "attendanceDate",
      header: "Date",
      render: (row) =>
        row.attendanceDate
          ? format(parseISO(row.attendanceDate), "dd MMM yyyy")
          : "—",
    },
    {
      key: "requestedTimes",
      header: "Requested Times",
      render: (row) => (
        <span className="whitespace-nowrap text-sm">
          {formatTime(row.requestedCheckInAt)} – {formatTime(row.requestedCheckOutAt)}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (row) => (
        <span className="line-clamp-2 max-w-xs text-sm">{row.reason}</span>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      render: (row) => format(parseISO(row.submittedAt), "dd MMM yyyy"),
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
        </div>
      ),
    },
  ];

  return (
    <>
      <LeavePanel
        title="CEO Regularization Queue"
        description="Attendance regularization from HR and Manager users. Only you can approve or reject these requests."
        count={items.length}
      >
        <DataTable
          columns={columns}
          data={items}
          emptyMessage={
            isLoading
              ? "Loading…"
              : "No attendance regularization requests are awaiting your approval."
          }
        />
      </LeavePanel>

      <Modal
        open={target?.type === "approve"}
        onOpenChange={(open) => !open && closeModal()}
        title="Approve regularization"
        description={
          target
            ? `Approve attendance regularization for ${target.item.employeeName}?`
            : undefined
        }
        showCancel={false}
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={isActing}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isActing}>
              Approve
            </Button>
          </>
        }
      >
        {target ? (
          <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm">
            <p>
              <span className="text-muted-foreground">Employee: </span>
              {target.item.employeeName}
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Date: </span>
              {target.item.attendanceDate
                ? format(parseISO(target.item.attendanceDate), "dd MMM yyyy")
                : "—"}
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={target?.type === "reject"}
        onOpenChange={(open) => !open && closeModal()}
        title="Reject regularization"
        description={
          target
            ? `Reject attendance regularization for ${target.item.employeeName}?`
            : undefined
        }
        showCancel={false}
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={isActing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isActing}>
              Reject
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="reject-notes">Rejection reason (optional)</Label>
          <textarea
            id="reject-notes"
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={rejectNotes}
            onChange={(event) => setRejectNotes(event.target.value)}
            placeholder="Provide a reason for rejection"
          />
        </div>
      </Modal>
    </>
  );
}
