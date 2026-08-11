"use client";

import { format } from "date-fns";
import { Eye } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { GoalDetailModal } from "@/components/performance/goal-detail-modal";
import { GoalStatusBadge } from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  TableActions,
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
                <th className="px-3 py-2.5 font-medium">Goal</th>
                <th className="px-3 py-2.5 font-medium">Key results</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Due</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {goals.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{row.title}</div>
                    {row.category ? (
                      <div className="text-xs text-muted-foreground">{row.category}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {row.completedMilestones}/{row.milestoneCount}
                  </td>
                  <td className="px-3 py-2.5">
                    <GoalStatusBadge status={row.goalStatus} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                    {row.dueDate ? format(new Date(row.dueDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <TableActions>
                      <Button size="sm" variant="outline" onClick={() => setViewId(row.id)}>
                        <Eye className="mr-1 size-3.5" />
                        View
                      </Button>
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
    "@/lib/employee/actions/employee-goals-actions"
  );
  return fetchMyGoalDetailAction(goalId);
}

async function toggleMyGoalMilestone(input: {
  goalId: string;
  milestoneId: string;
  isCompleted: boolean;
}) {
  const { toggleMyGoalMilestoneAction } = await import(
    "@/lib/employee/actions/employee-goals-actions"
  );
  return toggleMyGoalMilestoneAction(input);
}
