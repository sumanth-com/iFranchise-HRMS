"use client";

import { format } from "date-fns";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { FeedbackDetailModal } from "@/components/performance/feedback-detail-modal";
import { FeedbackTypeBadge } from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  TableActions,
  ViewIconButton,
} from "@/components/performance/performance-ui-primitives";
import type { FeedbackListItem } from "@/types/performance";

export function EmployeeFeedbackView({ feedback }: { feedback: FeedbackListItem[] }) {
  const [viewRecord, setViewRecord] = useState<FeedbackListItem | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <PerformanceTableShell
        className="max-h-[min(50vh,420px)]"
        empty={
          <EmptyState
            title="No feedback yet"
            description="Feedback shared with you will appear here in your profile area."
            className="border-0 py-10"
          />
        }
      >
        {feedback.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {feedback.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-4 py-3">{row.fromEmployeeName}</td>
                  <td className="px-4 py-3">
                    <FeedbackTypeBadge type={row.feedbackType} />
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="line-clamp-2">{row.message}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {format(new Date(row.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <TableActions>
                      <ViewIconButton onClick={() => setViewRecord(row)} />
                    </TableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </PerformanceTableShell>

      <FeedbackDetailModal
        record={viewRecord}
        open={!!viewRecord}
        onOpenChange={(open) => !open && setViewRecord(null)}
      />
    </div>
  );
}
