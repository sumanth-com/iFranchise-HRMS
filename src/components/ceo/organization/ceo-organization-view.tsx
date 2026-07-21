"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoOrganizationDistribution } from "@/components/ceo/organization/ceo-organization-distribution";
import { CeoOrganizationDrawer } from "@/components/ceo/organization/ceo-organization-drawer";
import { CeoOrganizationFilters } from "@/components/ceo/organization/ceo-organization-filters";
import { CeoOrganizationHierarchy } from "@/components/ceo/organization/ceo-organization-hierarchy";
import { CeoOrganizationPeople } from "@/components/ceo/organization/ceo-organization-people";
import { CeoOrganizationSignals } from "@/components/ceo/organization/ceo-organization-signals";
import { CeoOrganizationSummary } from "@/components/ceo/organization/ceo-organization-summary";
import {
  fetchCeoOrgEmployeesAction,
  fetchCeoOrgInsightsAction,
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
  pageSize: 8,
  sortBy: "first_name",
  sortOrder: "asc",
};

export function CeoOrganizationView({
  summary,
  employees: initialEmployees,
  lookups,
  hierarchyRoots,
  insights: initialInsights,
  initialFilters,
  initialEmployeeId,
}: CeoOrganizationViewProps) {
  const [insights, setInsights] = useState(initialInsights);
  const [people, setPeople] = useState(initialEmployees);
  const [filters, setFilters] = useState<CeoOrgListParams>(initialFilters);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    initialEmployeeId ?? null,
  );
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialEmployeeId));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!initialEmployeeId) return;
    setSelectedEmployeeId(initialEmployeeId);
    setDrawerOpen(true);
  }, [initialEmployeeId]);

  const refreshScopedData = useCallback((nextFilters: CeoOrgListParams) => {
    startTransition(async () => {
      const [nextInsights, nextPeople] = await Promise.all([
        fetchCeoOrgInsightsAction(
          nextFilters.departmentId,
          nextFilters.employmentTypeId,
        ),
        fetchCeoOrgEmployeesAction(nextFilters),
      ]);
      setInsights(nextInsights);
      setPeople(nextPeople);
    });
  }, []);

  function updateFilters(next: Partial<CeoOrgListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
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
        description="View the complete company structure, managers, and workforce distribution."
      />

      <CeoOrganizationSummary summary={summary} />

      <CeoOrganizationDistribution insights={insights} />

      <CeoOrganizationSignals insights={insights} />

      <CeoOrganizationFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={isPending}
      />

      <CeoOrganizationPeople
        employees={people.data}
        total={people.total}
        page={people.page}
        pageSize={people.pageSize}
        isLoading={isPending}
        onPageChange={(page) => updateFilters({ page })}
        onView={openEmployee}
      />

      <CeoOrganizationHierarchy
        roots={hierarchyRoots}
        onSelectEmployee={openEmployee}
      />

      <CeoOrganizationDrawer
        employeeId={selectedEmployeeId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
