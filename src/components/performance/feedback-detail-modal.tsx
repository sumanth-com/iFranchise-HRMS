"use client";

import { format } from "date-fns";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { FeedbackTypeBadge } from "@/components/performance/performance-status-badge";
import { DetailField, DetailGrid } from "@/components/performance/performance-ui-primitives";
import type { FeedbackListItem } from "@/types/performance";

type Props = {
  record: FeedbackListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeedbackDetailModal({ record, open, onOpenChange }: Props) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Feedback"
      description={record ? `From ${record.fromEmployeeName} to ${record.toEmployeeName}` : undefined}
      contentClassName="sm:max-w-xl"
      showCancel={false}
      footer={
        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
      }
    >
      {!record ? null : (
        <div className="space-y-4">
          <FeedbackTypeBadge type={record.feedbackType} />
          <DetailGrid>
            <DetailField label="To employee" value={record.toEmployeeName} />
            <DetailField label="From" value={record.fromEmployeeName} />
            <DetailField
              label="Date"
              value={format(new Date(record.createdAt), "MMM d, yyyy")}
            />
          </DetailGrid>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Message
            </p>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{record.message}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
