"use client";

import { useCallback, useState, useTransition } from "react";

import { ManagerPerformanceFilters } from "@/components/manager/performance/manager-performance-filters";
import { ManagerPerformanceKpis } from "@/components/manager/performance/manager-performance-kpis";
import type { ProfileTab } from "@/components/manager/performance/manager-performance-profile-drawer";
import { ManagerPerformanceProfileDrawer } from "@/components/manager/performance/manager-performance-profile-drawer";
import { ManagerPerformanceTable } from "@/components/manager/performance/manager-performance-table";
import { ManagerPerformanceTrends } from "@/components/manager/performance/manager-performance-trends";
import {
  fetchTeamPerformanceOverviewAction,
  fetchTeamPerformanceSummaryAction,
} from "@/lib/manager/actions/manager-performance-actions";
import type {
  ManagerTeamPerformancePageData,
  TeamPerformanceListParams,
} from "@/types/manager-performance";

type ManagerPerformanceViewProps = ManagerTeamPerformancePageData & {
  initialFilters: TeamPerformanceListParams;
  managerEmployeeId: string;
  initialEmployeeId?: string;
  initialTab?: ProfileTab;
};

export function ManagerPerformanceView({
  summary: initialSummary,
  records: initialRecords,
  lookups,
  trends,
  initialFilters,
  managerEmployeeId,
  initialEmployeeId,
  initialTab,
}: ManagerPerformanceViewProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [tableState, setTableState] = useState(initialRecords);
  const [filters, setFilters] = useState<TeamPerformanceListParams>(initialFilters);
  const [isPending, startTransition] = useTransition();
  const validInitialEmployeeId =
    initialEmployeeId && initialEmployeeId !== managerEmployeeId ? initialEmployeeId : undefined;

  const [drawerEmployeeId, setDrawerEmployeeId] = useState<string | null>(
    validInitialEmployeeId ?? null,
  );
  const [drawerTab, setDrawerTab] = useState<ProfileTab>(initialTab ?? "overview");
  const [drawerOpen, setDrawerOpen] = useState(Boolean(validInitialEmployeeId || initialTab));

  const refreshData = useCallback((nextFilters: TeamPerformanceListParams) => {
    startTransition(async () => {
      const [records, nextSummary] = await Promise.all([
        fetchTeamPerformanceOverviewAction(nextFilters),
        fetchTeamPerformanceSummaryAction(),
      ]);
      setTableState(records);
      setSummary(nextSummary);
    });
  }, []);

  function updateFilters(next: Partial<TeamPerformanceListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    refreshData(merged);
  }

  function openProfile(employeeId: string, tab: ProfileTab = "overview") {
    setDrawerEmployeeId(employeeId);
    setDrawerTab(tab);
    setDrawerOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Performance</h1>
        <p className="text-sm text-muted-foreground">
          Reviews, goals, feedback, and 1:1s for your reporting hierarchy only.
        </p>
      </div>

      <ManagerPerformanceKpis summary={summary} />
      <ManagerPerformanceFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        disabled={isPending}
      />
      <ManagerPerformanceTrends trends={trends} />
      <ManagerPerformanceTable
        records={tableState.data}
        total={tableState.total}
        page={tableState.page}
        pageSize={tableState.pageSize}
        isLoading={isPending}
        onPageChange={(page) => updateFilters({ page })}
        onViewProfile={openProfile}
        onScheduleOneOnOne={(employeeId) => openProfile(employeeId, "oneOnOne")}
      />

      <ManagerPerformanceProfileDrawer
        employeeId={drawerEmployeeId}
        initialTab={drawerTab}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        managerEmployeeId={managerEmployeeId}
        onActionComplete={() => refreshData(filters)}
      />
    </div>
  );
}
