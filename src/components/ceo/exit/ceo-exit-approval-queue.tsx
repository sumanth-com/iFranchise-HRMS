"use client";

import { format } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { LeavePanel } from "@/components/ceo/leave/ceo-leave-tables";
import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { decideCeoExitAction } from "@/lib/ceo/actions/ceo-exit-actions";
import { EXIT_STATUS_LABELS } from "@/lib/exit/constants";
import type { ExitResignationItem } from "@/types/exit";

type Props = {
  items?: ExitResignationItem[] | null;
  isLoading?: boolean;
  onActed: () => void;
};

export function CeoExitApprovalQueue({
  items,
  isLoading,
  onActed,
}: Props) {
  const rows = Array.isArray(items) ? items : [];
  const [target, setTarget] = useState<{
    item: ExitResignationItem;
    type: "approve" | "reject";
  } | null>(null);
  const [remarks, setRemarks] = useState("");
  const [rejectedReason, setRejectedReason] = useState("");
  const [isActing, startActing] = useTransition();

  const closeModal = () => {
    setTarget(null);
    setRemarks("");
    setRejectedReason("");
  };

  const handleSubmit = () => {
    if (!target) return;
    startActing(async () => {
      const result = await decideCeoExitAction({
        resignationId: target.item.id,
        decision: target.type === "approve" ? "approve" : "reject",
        remarks: remarks.trim() || null,
        rejectedReason:
          target.type === "reject" ? rejectedReason.trim() || null : null,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(
        target.type === "approve"
          ? "Resignation approved — clearance started"
          : "Resignation rejected",
      );
      closeModal();
      onActed();
    });
  };

  return (
    <>
      <LeavePanel
        title="CEO Exit Queue"
        description="Resignations already cleared by manager and HR. Only you can give final approval."
        count={rows.length}
      >
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Last day</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {isLoading
                      ? "Loading…"
                      : "No resignations awaiting CEO approval."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.employeeName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.employeeCode}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.departmentName ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(row.resignationDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(row.lastWorkingDay), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="line-clamp-2 max-w-xs">{row.reason}</span>
                    </td>
                    <td className="px-4 py-3">
                      {EXIT_STATUS_LABELS[row.exitStatus]}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </LeavePanel>

      <Modal
        open={!!target}
        onOpenChange={(open) => !open && closeModal()}
        title={
          target?.type === "approve"
            ? "CEO approve resignation"
            : "CEO reject resignation"
        }
        description={
          target
            ? `${target.item.employeeName} · ${target.item.reason}`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={isActing}>
              Cancel
            </Button>
            <Button
              variant={target?.type === "reject" ? "destructive" : "default"}
              onClick={handleSubmit}
              disabled={isActing}
            >
              {target?.type === "approve" ? "Approve & start clearance" : "Reject"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ceo-exit-remarks">Remarks</Label>
            <textarea
              id="ceo-exit-remarks"
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              disabled={isActing}
            />
          </div>
          {target?.type === "reject" ? (
            <div className="space-y-2">
              <Label htmlFor="ceo-exit-reject-reason">Rejection reason</Label>
              <textarea
                id="ceo-exit-reject-reason"
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={rejectedReason}
                onChange={(event) => setRejectedReason(event.target.value)}
                disabled={isActing}
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
