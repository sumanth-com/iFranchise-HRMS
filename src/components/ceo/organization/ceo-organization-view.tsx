"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoOrganizationDepartments } from "@/components/ceo/organization/ceo-organization-departments";
import { CeoOrganizationDrawer } from "@/components/ceo/organization/ceo-organization-drawer";
import { CeoOrganizationFilters } from "@/components/ceo/organization/ceo-organization-filters";
import { CeoOrganizationHierarchy } from "@/components/ceo/organization/ceo-organization-hierarchy";
import { CeoOrganizationInsights } from "@/components/ceo/organization/ceo-organization-insights";
import { CeoOrganizationSummary } from "@/components/ceo/organization/ceo-organization-summary";
import { CeoOrganizationTable } from "@/components/ceo/organization/ceo-organization-table";
import {
  fetchCeoOrgDepartmentsAction,
  fetchCeoOrgEmployeesAction,
  fetchCeoOrgInsightsAction,
  fetchCeoOrgSummaryAction,
} from "@/lib/ceo/actions/ceo-organization-actions";
import type {
  CeoOrgListParams,
  CeoOrganizationPageData,
} from "@/types/ceo-organization";

type CeoOrganizationViewProps = CeoOrganizationPageData & {
  initialFilters: CeoOrgListParams;
  initialEmployeeId?: string;
};

const DEFAULT_FILTERS: CeoOrgListParams = {
  page: 1,
  pageSize: 10,
  sortBy: "first_name",
  sortOrder: "asc",
};

export function CeoOrganizationView({
  summary: initialSummary,
  employees: initialEmployees,
  lookups,
  departments: initialDepartments,
  hierarchyRoots,
  insights: initialInsights,
  initialFilters,
  initialEmployeeId,
}: CeoOrganizationViewProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [tableState, setTableState] = useState(initialEmployees);
  const [departments, setDepartments] = useState(initialDepartments);
  const [insights, setInsights] = useState(initialInsights);
  const [filters, setFilters] = useState<CeoOrgListParams>(initialFilters);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    initialEmployeeId ?? null,
  );
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialEmployeeId));
  const [isPending, startTransition] = useTransition();
  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!initialEmployeeId) return;
    setSelectedEmployeeId(initialEmployeeId);
    setDrawerOpen(true);
  }, [initialEmployeeId]);

  const refreshScopedData = useCallback((nextFilters: CeoOrgListParams) => {
    startTransition(async () => {
      const [employees, nextDepartments, nextInsights, nextSummary] = await Promise.all([
        fetchCeoOrgEmployeesAction(nextFilters),
        fetchCeoOrgDepartmentsAction(nextFilters.departmentId),
        fetchCeoOrgInsightsAction(nextFilters.departmentId),
        fetchCeoOrgSummaryAction(),
      ]);
      setTableState(employees);
      setDepartments(nextDepartments);
      setInsights(nextInsights);
      setSummary(nextSummary);
    });
  }, []);

  function updateFilters(next: Partial<CeoOrgListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);

    if ("search" in next) {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = window.setTimeout(() => {
        refreshScopedData(merged);
      }, 250);
      return;
    }

    refreshScopedData(merged);
  }

  function resetFilters() {
    const next = { ...DEFAULT_FILTERS };
    setFilters(next);
    refreshScopedData(next);
  }

  function openEmployee(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    setDrawerOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <CeoBackToDashboard />
      <CeoModulePageHeader
        title="Organization"
        description="View the complete company structure, departments, managers, and workforce distribution."
      />

      <CeoOrganizationSummary summary={summary} />

      <CeoOrganizationFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={isPending}
      />

      <CeoOrganizationDepartments
        departments={departments}
        selectedDepartmentId={filters.departmentId}
        onSelect={(departmentId) => updateFilters({ departmentId, page: 1 })}
      />

      <CeoOrganizationTable
        employees={tableState.data}
        total={tableState.total}
        page={tableState.page}
        pageSize={tableState.pageSize}
        isLoading={isPending}
        onPageChange={(page) => updateFilters({ page })}
        onView={openEmployee}
      />

      <CeoOrganizationHierarchy
        roots={hierarchyRoots}
        onSelectEmployee={openEmployee}
      />

      <CeoOrganizationInsights insights={insights} />

      <CeoOrganizationDrawer
        employeeId={selectedEmployeeId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
