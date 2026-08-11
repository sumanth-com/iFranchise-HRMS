"use client";

import { format } from "date-fns";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { DetailField } from "@/components/performance/performance-ui-primitives";
import type { HistoryEvent } from "@/types/performance";

const EVENT_LABELS: Record<HistoryEvent["eventType"], string> = {
  review: "Review",
  promotion: "Promotion",
  feedback: "Feedback",
  goal: "Goal",
  salary_revision: "Salary revision",
  bonus: "Award / bonus",
};

type Props = {
  event: HistoryEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HistoryEventModal({ event, open, onOpenChange }: Props) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={event ? EVENT_LABELS[event.eventType] : "Event details"}
      description={event?.employeeName}
      contentClassName="sm:max-w-md"
      showCancel={false}
      footer={
        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
      }
    >
      {!event ? null : (
        <div className="space-y-4">
          <DetailField label="Event" value={event.title} />
          <DetailField label="Employee" value={event.employeeName} />
          <DetailField
            label="Date"
            value={format(new Date(event.occurredAt), "MMM d, yyyy h:mm a")}
          />
          {event.description ? (
            <DetailField label="Details" value={event.description} />
          ) : null}
        </div>
      )}
    </Modal>
  );
}
