"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoLeaveApprovalQueue } from "@/components/ceo/leave/ceo-leave-approval-queue";
import { CeoLeaveCalendarPanel } from "@/components/ceo/leave/ceo-leave-calendar-panel";
import { CeoLeaveDepartmentOverview } from "@/components/ceo/leave/ceo-leave-department-overview";
import { CeoLeaveDetailDrawer } from "@/components/ceo/leave/ceo-leave-detail-drawer";
import { CeoLeaveFilters } from "@/components/ceo/leave/ceo-leave-filters";
import { CeoLeaveInsights } from "@/components/ceo/leave/ceo-leave-insights";
import { CeoLeaveSummaryCards } from "@/components/ceo/leave/ceo-leave-summary";
import {
  CeoTodaysLeaveTable,
  CeoUpcomingLeaveTable,
  LeavePanel,
} from "@/components/ceo/leave/ceo-leave-tables";
import {
  fetchCeoApprovalQueueAction,
  fetchCeoLeaveListsAction,
  getCeoLeaveModuleData,
} from "@/lib/ceo/actions/ceo-leave-actions";
import type { CeoLeaveFilters as CeoLeaveFilterValues, CeoLeaveModuleData } from "@/types/ceo-leave";

export function CeoLeaveView(props: CeoLeaveModuleData) {
  const [summary, setSummary] = useState(props.summary);
  const [todaysLeave, setTodaysLeave] = useState(props.todaysLeave);
  const [upcomingLeave, setUpcomingLeave] = useState(props.upcomingLeave);
  const [approvalQueue, setApprovalQueue] = useState(props.approvalQueue);
  const [departmentOverview, setDepartmentOverview] = useState(props.departmentOverview);
  const [insights, setInsights] = useState(props.insights);

  const [filters, setFilters] = useState<CeoLeaveFilterValues>({});
  const [isPending, startTransition] = useTransition();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const refreshLists = useCallback((nextFilters: CeoLeaveFilterValues) => {
    startTransition(async () => {
      const result = await fetchCeoLeaveListsAction(nextFilters);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setTodaysLeave(result.data.todaysLeave);
      setUpcomingLeave(result.data.upcomingLeave);
      setDepartmentOverview(result.data.departmentOverview);
    });
  }, []);

  const refreshAll = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getCeoLeaveModuleData(filters);
        setSummary(data.summary);
        setTodaysLeave(data.todaysLeave);
        setUpcomingLeave(data.upcomingLeave);
        setApprovalQueue(data.approvalQueue);
        setDepartmentOverview(data.departmentOverview);
        setInsights(data.insights);
      } catch {
        // Fall back to a lighter refresh if the full reload fails.
        const queue = await fetchCeoApprovalQueueAction();
        if (queue.success) setApprovalQueue(queue.data);
      }
    });
  }, [filters]);

  const handleFilterChange = (partial: Partial<CeoLeaveFilterValues>) => {
    const next = { ...filters, ...partial };
    setFilters(next);
    refreshLists(next);
  };

  const handleReset = () => {
    setFilters({});
    refreshLists({});
  };

  const handleView = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <CeoBackToDashboard />

      <CeoModulePageHeader
        title="Leave"
        description="Monitor organizational leave, executive approvals, and workforce availability."
      />

      <CeoLeaveSummaryCards summary={summary} />

      <CeoLeaveFilters
        filters={filters}
        lookups={props.lookups}
        onChange={handleFilterChange}
        onReset={handleReset}
        disabled={isPending}
      />

      <CeoLeaveApprovalQueue
        items={approvalQueue}
        forwardTargets={props.forwardTargets}
        isLoading={isPending}
        onView={handleView}
        onActed={refreshAll}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <LeavePanel
          title="Today's Leave"
          description="Employees currently on leave."
          count={todaysLeave.length}
        >
          <CeoTodaysLeaveTable
            records={todaysLeave}
            isLoading={isPending}
            onView={handleView}
          />
        </LeavePanel>

        <LeavePanel
          title="Upcoming Leave"
          description="Scheduled leave in the period ahead."
          count={upcomingLeave.length}
        >
          <CeoUpcomingLeaveTable
            records={upcomingLeave}
            isLoading={isPending}
            onView={handleView}
          />
        </LeavePanel>
      </div>

      <CeoLeaveCalendarPanel initial={props.calendar} />

      <div className="grid gap-4 xl:grid-cols-2">
        <CeoLeaveDepartmentOverview departments={departmentOverview} />
        <CeoLeaveInsights insights={insights} />
      </div>

      <CeoLeaveDetailDrawer
        leaveRequestId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        forwardTargets={props.forwardTargets}
        onActed={refreshAll}
      />
    </div>
  );
}
