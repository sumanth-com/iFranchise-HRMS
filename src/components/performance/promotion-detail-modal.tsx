"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
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
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { approvePromotionAction, updatePromotionAction } from "@/lib/performance/actions";
import type { PromotionListItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

type Props = {
  record: PromotionListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canApprove?: boolean;
  canEdit?: boolean;
  designations?: LookupOption[];
};

export function PromotionDetailModal({
  record,
  open,
  onOpenChange,
  canApprove = false,
  canEdit = false,
  designations = [],
}: Props) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [recommendedDesignationId, setRecommendedDesignationId] = useState("");
  const [currentSalary, setCurrentSalary] = useState("");
  const [recommendedSalary, setRecommendedSalary] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!record) return;
    setRecommendedDesignationId(record.recommendedDesignationId ?? "");
    setCurrentSalary(record.currentSalary != null ? String(record.currentSalary) : "");
    setRecommendedSalary(
      record.recommendedSalary != null ? String(record.recommendedSalary) : "",
    );
    setReason(record.reason ?? "");
    setComment("");
  }, [record]);

  const canApproveNow =
    canApprove &&
    record &&
    !canEdit &&
    ["pending", "recommended"].includes(record.promotionStatus);

  const canSaveEdit =
    canEdit &&
    record &&
    !["rejected", "cancelled"].includes(record.promotionStatus);

  function saveEdit() {
    if (!record) return;
    startTransition(async () => {
      const result = await updatePromotionAction({
        promotionId: record.id,
        recommendedDesignationId: recommendedDesignationId || null,
        currentSalary: currentSalary ? Number(currentSalary) : null,
        recommendedSalary: recommendedSalary ? Number(recommendedSalary) : null,
        reason: reason.trim() || null,
      });
      if (!result.success) toast.error(result.message);
      else {
        toast.success("Promotion updated");
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={canEdit ? "Edit promotion" : "Promotion recommendation"}
        description={record?.employeeName}
        contentClassName="sm:max-w-lg"
        showCancel={false}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {canSaveEdit ? (
              <Button onClick={saveEdit} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            ) : null}
            {canApproveNow ? (
              <Button onClick={() => setApproveOpen(true)}>Approve step</Button>
            ) : null}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        }
      >
        {!record ? null : canEdit ? (
          <div className="space-y-4">
            <PromotionStatusBadge status={record.promotionStatus} />
            <div className="space-y-1.5">
              <Label className="text-xs">Recommended designation</Label>
              <LabeledSelect
                items={designations.map((d) => ({ value: d.id, label: d.label }))}
                value={recommendedDesignationId}
                onValueChange={setRecommendedDesignationId}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Current salary</Label>
                <Input
                  type="number"
                  min={0}
                  value={currentSalary}
                  disabled={isPending}
                  onChange={(e) => setCurrentSalary(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Recommended salary</Label>
                <Input
                  type="number"
                  min={0}
                  value={recommendedSalary}
                  disabled={isPending}
                  onChange={(e) => setRecommendedSalary(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <Input
                value={reason}
                disabled={isPending}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Promotion justification"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Saving a new recommended salary applies only after the promotion is fully approved.
            </p>
          </div>
        ) : (
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
