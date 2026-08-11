"use client";

import { format } from "date-fns";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/common/modal";
import { PerformanceConfirmModal } from "@/components/performance/performance-confirm-modal";
import { PromotionStatusBadge } from "@/components/performance/performance-status-badge";
import {
  DetailField,
  DetailGrid,
  PerformanceSection,
} from "@/components/performance/performance-ui-primitives";
import { approvePromotionAction } from "@/lib/performance/actions";
import type { PromotionListItem } from "@/types/performance";

type Props = {
  record: PromotionListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canApprove?: boolean;
};

export function PromotionDetailModal({
  record,
  open,
  onOpenChange,
  canApprove = false,
}: Props) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  const canApproveNow =
    canApprove &&
    record &&
    ["pending", "recommended"].includes(record.promotionStatus);

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Promotion recommendation"
        description={record?.employeeName}
        contentClassName="sm:max-w-lg"
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
        {!record ? null : (
          <div className="space-y-4">
            <PromotionStatusBadge status={record.promotionStatus} />

            <PerformanceSection title="Role change">
              <DetailGrid>
                <DetailField label="Current role" value={record.currentDesignation ?? "—"} />
                <DetailField label="Proposed role" value={record.recommendedDesignation ?? "—"} />
                <DetailField label="Department" value={record.departmentName ?? "—"} />
                <DetailField label="Recommended by" value={record.recommendedByName ?? "—"} />
              </DetailGrid>
            </PerformanceSection>

            <PerformanceSection title="Compensation">
              <DetailGrid>
                <DetailField
                  label="Current salary"
                  value={
                    record.currentSalary != null
                      ? `₹${record.currentSalary.toLocaleString()}`
                      : "—"
                  }
                />
                <DetailField
                  label="Proposed salary"
                  value={
                    record.recommendedSalary != null
                      ? `₹${record.recommendedSalary.toLocaleString()}`
                      : "—"
                  }
                />
              </DetailGrid>
            </PerformanceSection>

            {record.reason ? (
              <PerformanceSection title="Reason">
                <p className="text-sm leading-relaxed text-muted-foreground">{record.reason}</p>
              </PerformanceSection>
            ) : null}

            <DetailField
              label="Submitted"
              value={format(new Date(record.createdAt), "MMM d, yyyy")}
            />
          </div>
        )}
      </Modal>

      <PerformanceConfirmModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Confirm promotion approval"
        description="Approve this promotion recommendation and advance the workflow."
        confirmLabel="Confirm approval"
        isPending={isPending}
        onConfirm={() => {
          if (!record) return;
          startTransition(async () => {
            const result = await approvePromotionAction({
              promotionId: record.id,
              comments: comment.trim() || undefined,
            });
            if (!result.success) toast.error(result.message);
            else {
              toast.success("Promotion step approved");
              setApproveOpen(false);
              setComment("");
              onOpenChange(false);
              router.refresh();
            }
          });
        }}
      >
        {record ? (
          <p>
            Employee: <strong>{record.employeeName}</strong>
            {record.recommendedDesignation ? (
              <> → {record.recommendedDesignation}</>
            ) : null}
          </p>
        ) : null}
        <div className="space-y-1.5 pt-2">
          <Label className="text-xs">Optional comment</Label>
          <Input
            value={comment}
            disabled={isPending}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Approval notes…"
          />
        </div>
      </PerformanceConfirmModal>
    </>
  );
}
