"use client";

import { useCallback, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoPerformanceDrawer } from "@/components/ceo/performance/ceo-performance-drawer";
import { CeoPerformanceEmployeesTable } from "@/components/ceo/performance/ceo-performance-employees-table";
import { CeoPerformanceFilters } from "@/components/ceo/performance/ceo-performance-filters";
import { CeoPerformancePanels } from "@/components/ceo/performance/ceo-performance-panels";
import { CeoPerformanceSummary } from "@/components/ceo/performance/ceo-performance-summary";
import { CeoPerformanceTopPerformers } from "@/components/ceo/performance/ceo-performance-top-performers";
import {
  fetchCeoPerformanceDepartmentsAction,
  fetchCeoPerformanceEmployeesAction,
  fetchCeoPerformanceKpisAction,
  fetchCeoPerformanceLowPerformanceAction,
  fetchCeoPerformanceOverviewAction,
  fetchCeoPerformancePromotionsAction,
  fetchCeoPerformanceTopPerformersAction,
  getCeoPerformanceModuleData,
} from "@/lib/ceo/actions/ceo-performance-actions";
import type {
  CeoPerformanceListParams,
  CeoPerformancePageData,
} from "@/types/ceo-performance";

type CeoPerformanceViewProps = CeoPerformancePageData & {
  initialFilters: CeoPerformanceListParams;
};

const DEFAULT_FILTERS: CeoPerformanceListParams = {
  page: 1,
  pageSize: 10,
};

export function CeoPerformanceView({
  kpis: initialKpis,
  overview: initialOverview,
  departments: initialDepartments,
  employees: initialEmployees,
  topPerformers: initialTopPerformers,
  lowPerformance: initialLowPerformance,
  promotions: initialPromotions,
  lookups,
  initialFilters,
}: CeoPerformanceViewProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [overview, setOverview] = useState(initialOverview);
  const [departments, setDepartments] = useState(initialDepartments);
  const [employees, setEmployees] = useState(initialEmployees);
  const [topPerformers, setTopPerformers] = useState(initialTopPerformers);
  const [lowPerformance, setLowPerformance] = useState(initialLowPerformance);
  const [promotions, setPromotions] = useState(initialPromotions);
  const [filters, setFilters] = useState<CeoPerformanceListParams>(initialFilters);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refreshScopedData = useCallback((nextFilters: CeoPerformanceListParams) => {
    startTransition(async () => {
      const [
        nextKpis,
        nextOverview,
        nextDepartments,
        nextEmployees,
        nextTop,
        nextLow,
        nextPromotions,
      ] = await Promise.all([
        fetchCeoPerformanceKpisAction(nextFilters),
        fetchCeoPerformanceOverviewAction(nextFilters),
        fetchCeoPerformanceDepartmentsAction(nextFilters),
        fetchCeoPerformanceEmployeesAction(nextFilters),
        fetchCeoPerformanceTopPerformersAction(nextFilters),
        fetchCeoPerformanceLowPerformanceAction(nextFilters),
        fetchCeoPerformancePromotionsAction(nextFilters),
      ]);
      setKpis(nextKpis);
      setOverview(nextOverview);
      setDepartments(nextDepartments);
      setEmployees(nextEmployees);
      setTopPerformers(nextTop);
      setLowPerformance(nextLow);
      setPromotions(nextPromotions);
    });
  }, []);

  function updateFilters(next: Partial<CeoPerformanceListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    refreshScopedData(merged);
  }

  function resetFilters() {
    const next = { ...DEFAULT_FILTERS };
    setFilters(next);
    startTransition(async () => {
      const data = await getCeoPerformanceModuleData(next);
      setKpis(data.kpis);
      setOverview(data.overview);
      setDepartments(data.departments);
      setEmployees(data.employees);
      setTopPerformers(data.topPerformers);
      setLowPerformance(data.lowPerformance);
      setPromotions(data.promotions);
    });
  }

  function openEmployee(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    setDrawerOpen(true);
  }

  const hasScopedFilters = Boolean(
    filters.employeeId ||
      filters.departmentId ||
      filters.managerId ||
      filters.cycleId ||
      filters.rating ||
      filters.employmentTypeId,
  );

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto scroll-smooth p-3 pb-8 md:gap-4 md:p-4 md:pb-10 lg:p-5">
      <CeoBackToDashboard />
      <CeoModulePageHeader
        title="Performance"
        description="Company ratings, review backlog, and teams that need your attention."
      />

      <CeoPerformanceSummary kpis={kpis} />

      <CeoPerformanceFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={isPending}
      />

      <CeoPerformancePanels
        departments={departments}
        kpis={kpis}
        overview={overview}
        lowPerformance={lowPerformance}
        promotions={promotions}
        onSelectDepartment={(departmentId) => updateFilters({ departmentId, page: 1 })}
        onSelectEmployee={openEmployee}
      />

      <CeoPerformanceTopPerformers data={topPerformers} />

      {hasScopedFilters ? (
        <CeoPerformanceEmployeesTable
          employees={employees.data}
          total={employees.total}
          page={employees.page}
          pageSize={employees.pageSize}
          isLoading={isPending}
          onPageChange={(page) => updateFilters({ page })}
          onView={openEmployee}
        />
      ) : null}

      <CeoPerformanceDrawer
        employeeId={selectedEmployeeId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
