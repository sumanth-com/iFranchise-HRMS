"use client";

import { format } from "date-fns";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { GoalDetailModal } from "@/components/performance/goal-detail-modal";
import { GoalStatusBadge } from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  TableActions,
  ViewIconButton,
} from "@/components/performance/performance-ui-primitives";
import type { GoalListItem } from "@/types/performance";

export function EmployeeGoalsView({ goals }: { goals: GoalListItem[] }) {
  const [viewId, setViewId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <PerformanceTableShell
        className="max-h-[min(50vh,420px)]"
        empty={
          <EmptyState
            title="No goals assigned yet"
            description="When HR or your manager assigns a goal, it will appear here."
            className="border-0 py-10"
          />
        }
      >
        {goals.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Goal</th>
                <th className="px-4 py-3 font-medium">Key results</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {goals.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.title}</div>
                    {row.category ? (
                      <div className="text-xs text-muted-foreground">{row.category}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.completedMilestones}/{row.milestoneCount}
                  </td>
                  <td className="px-4 py-3">
                    <GoalStatusBadge status={row.goalStatus} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {row.dueDate ? format(new Date(row.dueDate), "MMM d, yyyy") : "—"}
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

      <GoalDetailModal
        goalId={viewId}
        open={!!viewId}
        onOpenChange={(open) => !open && setViewId(null)}
        variant="employee"
        canEdit
        fetchDetail={fetchMyGoalDetail}
        toggleMilestone={toggleMyGoalMilestone}
      />
    </div>
  );
}

async function fetchMyGoalDetail(goalId: string) {
  const { fetchMyGoalDetailAction } = await import(
    "@/lib/employee/actions/employee-performance-actions"
  );
  return fetchMyGoalDetailAction(goalId);
}

async function toggleMyGoalMilestone(input: {
  goalId: string;
  milestoneId: string;
  isCompleted: boolean;
}) {
  const { toggleMyGoalMilestoneAction } = await import(
    "@/lib/employee/actions/employee-performance-actions"
  );
  return toggleMyGoalMilestoneAction(input);
}
