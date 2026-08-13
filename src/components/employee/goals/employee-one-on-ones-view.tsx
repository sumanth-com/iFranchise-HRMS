"use client";

import { format } from "date-fns";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { OneOnOneDetailModal } from "@/components/performance/one-on-one-detail-modal";
import { MeetingStatusBadge } from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  TableActions,
  ViewIconButton,
} from "@/components/performance/performance-ui-primitives";
import type { OneOnOneListItem } from "@/types/performance";

export function EmployeeOneOnOnesView({ meetings }: { meetings: OneOnOneListItem[] }) {
  const [viewId, setViewId] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PerformanceTableShell
        fill
        empty={
          <EmptyState
            title="No 1:1 meetings scheduled"
            description="When a meeting is scheduled with you, it will appear here."
            className="border-0 py-10"
          />
        }
      >
        {meetings.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Manager</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Agenda</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Follow-up</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {meetings.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-4 py-3">{row.managerName}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {format(new Date(row.scheduledAt), "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="line-clamp-2">{row.agenda ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <MeetingStatusBadge status={row.meetingStatus} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {row.followUpDate ? format(new Date(row.followUpDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <TableActions>
                      <ViewIconButton onClick={() => setViewId(row.id)} />
                    </TableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </PerformanceTableShell>

      <OneOnOneDetailModal
        meetingId={viewId}
        open={!!viewId}
        onOpenChange={(open) => !open && setViewId(null)}
        canEdit={false}
      />
    </div>
  );
}
