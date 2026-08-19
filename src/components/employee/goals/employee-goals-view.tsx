"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { GoalDetailModal } from "@/components/performance/goal-detail-modal";
import {
  buildStatusItems,
  currentMonthValue,
  currentYearValue,
  matchesAssignedPeriod,
  matchesTextQuery,
  MonthYearFilterFields,
  PerformanceFilters,
  type PerformanceFilterUpdates,
} from "@/components/performance/performance-filters";
import { GoalStatusBadge } from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  ProgressBar,
  TableActions,
  ViewIconButton,
} from "@/components/performance/performance-ui-primitives";
import { GOAL_STATUS_LABELS } from "@/lib/performance/constants";
import type { GoalListItem, GoalStatus } from "@/types/performance";

const statusItems = buildStatusItems(GOAL_STATUS_LABELS);

export function EmployeeGoalsView({ goals }: { goals: GoalListItem[] }) {
  const [rows, setRows] = useState(goals);
  const [viewId, setViewId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [goalStatus, setGoalStatus] = useState<string | undefined>();
  const [month, setMonth] = useState(currentMonthValue);
  const [year, setYear] = useState(currentYearValue);

  useEffect(() => {
    setRows(goals);
  }, [goals]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (goalStatus && row.goalStatus !== goalStatus) return false;
      if (!matchesAssignedPeriod(row.createdAt, month, year)) return false;
      return matchesTextQuery([row.title, row.category, row.description], search);
    });
  }, [rows, search, goalStatus, month, year]);

  function handleFiltersChange(updates: PerformanceFilterUpdates) {
    if ("search" in updates) setSearch(updates.search ?? "");
    if ("goalStatus" in updates) setGoalStatus(updates.goalStatus);
  }

  function applyProgress(patch: {
    goalId: string;
    goalStatus: GoalStatus;
    currentProgress: number;
    completedMilestones: number;
    milestoneCount: number;
  }) {
    setRows((current) =>
      current.map((row) =>
        row.id === patch.goalId
          ? {
              ...row,
              goalStatus: patch.goalStatus,
              currentProgress: patch.currentProgress,
              completedMilestones: patch.completedMilestones,
              milestoneCount: patch.milestoneCount,
            }
          : row,
      ),
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PerformanceFilters
        employees={[]}
        statusItems={statusItems}
        statusKey="goalStatus"
        statusValue={goalStatus}
        search={search}
        searchPlaceholder="Search your goals…"
        variant="bar"
        showEmployee={false}
        showDepartment={false}
        showCycle={false}
        className="shrink-0 rounded-lg border bg-muted/10 p-3 xl:grid-cols-[minmax(14rem,1.3fr)_repeat(3,minmax(8.5rem,1fr))]"
        onFiltersChange={handleFiltersChange}
        extraFilters={
          <MonthYearFilterFields
            month={month}
            year={year}
            onMonthChange={setMonth}
            onYearChange={setYear}
          />
        }
      />

      <PerformanceTableShell
        fill
        empty={
          <EmptyState
            title={rows.length === 0 ? "No goals assigned yet" : "No goals for this period"}
            description={
              rows.length === 0
                ? "When HR or your manager assigns a goal, it will appear here."
                : "Try another month or year to see more goals."
            }
            className="border-0 py-10"
          />
        }
      >
        {filtered.length > 0 ? (
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
              {filtered.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.title}</div>
                    {row.category ? (
                      <div className="text-xs text-muted-foreground">{row.category}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1.5">
                      <p className="tabular-nums">
                        {row.completedMilestones}/{row.milestoneCount}
                      </p>
                      <ProgressBar value={row.currentProgress} className="max-w-[7.5rem]" />
                    </div>
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
        onChanged={(patch) => {
          if (patch) applyProgress(patch);
        }}
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
