"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/common/button";
import { ManagerTeamCards } from "@/components/manager/team/manager-team-cards";
import { ManagerTeamKpis } from "@/components/manager/team/manager-team-kpis";
import { HierarchyManagement } from "@/components/organization/hierarchy-management";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { fetchTeamEmployeesAction } from "@/lib/manager/actions/team-actions";
import type { ManagerTeamPageData, TeamListParams } from "@/types/manager-team";
import type { HierarchyEmployee, HierarchyNode } from "@/types/organization";

type ManagerTeamViewProps = ManagerTeamPageData & {
  managerEmployeeId: string;
};

const DEFAULT_LIST_PARAMS: TeamListParams = {
  page: 1,
  pageSize: 8,
  sortBy: "first_name",
  sortOrder: "asc",
};

type ViewMode = "directory" | "hierarchy";

function flattenHierarchy(node: HierarchyNode): HierarchyEmployee[] {
  return [
    {
      id: node.id,
      employeeCode: node.employeeCode,
      fullName: node.fullName,
      designationTitle: node.designationTitle,
      departmentName: node.departmentName,
      reportingManagerId: node.reportingManagerId,
    },
    ...node.children.flatMap(flattenHierarchy),
  ];
}

export function ManagerTeamView({
  summary: initialSummary,
  employees: initialEmployees,
  hierarchyRoot,
  managerEmployeeId,
}: ManagerTeamViewProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("directory");
  const [tableState, setTableState] = useState(initialEmployees);
  const [isPending, startTransition] = useTransition();

  const tree = useMemo(
    () => (hierarchyRoot ? [hierarchyRoot] : []),
    [hierarchyRoot],
  );
  const hierarchyEmployees = useMemo(
    () => (hierarchyRoot ? flattenHierarchy(hierarchyRoot) : []),
    [hierarchyRoot],
  );

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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:p-5">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teammates</h1>
          <p className="text-sm text-muted-foreground">
            Direct and indirect reports in your reporting hierarchy.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
          <Button
            size="sm"
            variant={viewMode === "directory" ? "default" : "ghost"}
            onClick={() => setViewMode("directory")}
          >
            Directory
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

      {viewMode === "directory" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
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
      ) : (
        <HierarchyManagement
          tree={tree}
          employees={hierarchyEmployees}
          permissionCodes={[]}
          readOnly
          embedded
          onSelectLeaf={(node) => {
            if (node.id !== managerEmployeeId) {
              router.push(MANAGER_ROUTES.teamMember(node.employeeCode));
            }
          }}
        />
      )}
    </div>
  );
}
