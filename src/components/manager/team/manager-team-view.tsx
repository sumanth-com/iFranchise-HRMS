"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { Button } from "@/components/common/button";
import { ManagerTeamCards } from "@/components/manager/team/manager-team-cards";
import { ManagerTeamFilters } from "@/components/manager/team/manager-team-filters";
import { ManagerTeamHierarchy } from "@/components/manager/team/manager-team-hierarchy";
import { ManagerTeamKpis } from "@/components/manager/team/manager-team-kpis";
import { ManagerTeamQuickActions } from "@/components/manager/team/manager-team-quick-actions";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { fetchTeamEmployeesAction, fetchTeamSummaryAction } from "@/lib/manager/actions/team-actions";
import type { ManagerTeamPageData, TeamListParams } from "@/types/manager-team";
import { cn } from "@/lib/utils";

type ManagerTeamViewProps = ManagerTeamPageData & {
  managerEmployeeId: string;
  initialFilters: TeamListParams;
};

type ViewMode = "directory" | "hierarchy";

export function ManagerTeamView({
  summary: initialSummary,
  employees: initialEmployees,
  lookups,
  hierarchyRoot,
  managerEmployeeId,
  initialFilters,
}: ManagerTeamViewProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("directory");
  const [summary, setSummary] = useState(initialSummary);
  const [tableState, setTableState] = useState(initialEmployees);
  const [filters, setFilters] = useState<TeamListParams>(initialFilters);
  const [isPending, startTransition] = useTransition();

  const refreshEmployees = useCallback(
    (nextFilters: TeamListParams) => {
      startTransition(async () => {
        const result = await fetchTeamEmployeesAction(nextFilters);
        setTableState(result);
      });
    },
    [],
  );

  function updateFilters(next: Partial<TeamListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    refreshEmployees(merged);
  }

  function refreshTeamData() {
    refreshEmployees(filters);
    startTransition(async () => {
      const nextSummary = await fetchTeamSummaryAction();
      setSummary(nextSummary);
    });
    router.refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Team</h1>
          <p className="text-sm text-muted-foreground">
            Direct and indirect reports in your reporting hierarchy only.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
          <Button
            size="sm"
            variant={viewMode === "directory" ? "default" : "ghost"}
            onClick={() => setViewMode("directory")}
          >
            Employee Directory
          </Button>
          <Button
            size="sm"
            variant={viewMode === "hierarchy" ? "default" : "ghost"}
            onClick={() => setViewMode("hierarchy")}
          >
            Hierarchy
          </Button>
        </div>
      </div>

      <ManagerTeamKpis summary={summary} />

      <ManagerTeamQuickActions onRefresh={refreshTeamData} />

      {viewMode === "directory" ? (
        <>
          <ManagerTeamFilters
            filters={filters}
            lookups={lookups}
            onChange={updateFilters}
            disabled={isPending}
          />
          <ManagerTeamCards
            employees={tableState.data}
            total={tableState.total}
            page={tableState.page}
            pageSize={tableState.pageSize}
            isLoading={isPending}
            onPageChange={(page) => updateFilters({ page })}
          />
        </>
      ) : (
        <div className={cn("max-w-3xl")}>
          <ManagerTeamHierarchy
            root={hierarchyRoot}
            onSelectEmployee={(node) => {
              if (node.id !== managerEmployeeId) {
                router.push(MANAGER_ROUTES.teamMember(node.employeeCode));
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
