"use client";

import { useCallback, useState, useTransition } from "react";

import { ManagerTeamCards } from "@/components/manager/team/manager-team-cards";
import { ManagerTeamKpis } from "@/components/manager/team/manager-team-kpis";
import { fetchTeamEmployeesAction } from "@/lib/manager/actions/team-actions";
import type { ManagerTeamPageData, TeamListParams } from "@/types/manager-team";

type ManagerTeamViewProps = ManagerTeamPageData;

const DEFAULT_LIST_PARAMS: TeamListParams = {
  page: 1,
  pageSize: 8,
  sortBy: "first_name",
  sortOrder: "asc",
};

export function ManagerTeamView({
  summary: initialSummary,
  employees: initialEmployees,
}: ManagerTeamViewProps) {
  const [tableState, setTableState] = useState(initialEmployees);
  const [isPending, startTransition] = useTransition();

  const refreshEmployees = useCallback((page: number) => {
    startTransition(async () => {
      const result = await fetchTeamEmployeesAction({
        ...DEFAULT_LIST_PARAMS,
        page,
      });
      setTableState(result);
    });
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-4">
        <div className="shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight">Teammates</h1>
          <p className="text-sm text-muted-foreground">
            Direct and indirect reports in your reporting hierarchy.
          </p>
        </div>

        <ManagerTeamKpis summary={initialSummary} />
        <ManagerTeamCards
          employees={tableState.data}
          total={tableState.total}
          page={tableState.page}
          pageSize={tableState.pageSize}
          isLoading={isPending}
          onPageChange={refreshEmployees}
        />
      </div>
    </div>
  );
}
