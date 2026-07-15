"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoPerformanceDepartmentsTable } from "@/components/ceo/performance/ceo-performance-departments-table";
import { CeoPerformanceDrawer } from "@/components/ceo/performance/ceo-performance-drawer";
import { CeoPerformanceEmployeesTable } from "@/components/ceo/performance/ceo-performance-employees-table";
import { CeoPerformanceFilters } from "@/components/ceo/performance/ceo-performance-filters";
import { CeoPerformanceInsights } from "@/components/ceo/performance/ceo-performance-insights";
import { CeoPerformanceLowPerformance } from "@/components/ceo/performance/ceo-performance-low-performance";
import { CeoPerformanceOverviewPanel } from "@/components/ceo/performance/ceo-performance-overview";
import { CeoPerformancePromotions } from "@/components/ceo/performance/ceo-performance-promotions";
import { CeoPerformanceSummary } from "@/components/ceo/performance/ceo-performance-summary";
import { CeoPerformanceTopPerformers } from "@/components/ceo/performance/ceo-performance-top-performers";
import {
  fetchCeoPerformanceDepartmentsAction,
  fetchCeoPerformanceEmployeesAction,
  fetchCeoPerformanceInsightsAction,
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
  insights: initialInsights,
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
  const [insights, setInsights] = useState(initialInsights);
  const [promotions, setPromotions] = useState(initialPromotions);
  const [filters, setFilters] = useState<CeoPerformanceListParams>(initialFilters);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, []);

  const refreshScopedData = useCallback((nextFilters: CeoPerformanceListParams) => {
    startTransition(async () => {
      const [
        nextKpis,
        nextOverview,
        nextDepartments,
        nextEmployees,
        nextTop,
        nextLow,
        nextInsights,
        nextPromotions,
      ] = await Promise.all([
        fetchCeoPerformanceKpisAction(nextFilters),
        fetchCeoPerformanceOverviewAction(nextFilters),
        fetchCeoPerformanceDepartmentsAction(nextFilters),
        fetchCeoPerformanceEmployeesAction(nextFilters),
        fetchCeoPerformanceTopPerformersAction(nextFilters),
        fetchCeoPerformanceLowPerformanceAction(nextFilters),
        fetchCeoPerformanceInsightsAction(nextFilters),
        fetchCeoPerformancePromotionsAction(nextFilters),
      ]);
      setKpis(nextKpis);
      setOverview(nextOverview);
      setDepartments(nextDepartments);
      setEmployees(nextEmployees);
      setTopPerformers(nextTop);
      setLowPerformance(nextLow);
      setInsights(nextInsights);
      setPromotions(nextPromotions);
    });
  }, []);

  function updateFilters(next: Partial<CeoPerformanceListParams>) {
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
    startTransition(async () => {
      const data = await getCeoPerformanceModuleData(next);
      setKpis(data.kpis);
      setOverview(data.overview);
      setDepartments(data.departments);
      setEmployees(data.employees);
      setTopPerformers(data.topPerformers);
      setLowPerformance(data.lowPerformance);
      setInsights(data.insights);
      setPromotions(data.promotions);
    });
  }

  function openEmployee(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    setDrawerOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <CeoBackToDashboard />
      <CeoModulePageHeader
        title="Performance"
        description="Monitor company-wide employee, department, manager, and organizational performance."
      />

      <CeoPerformanceSummary kpis={kpis} />

      <CeoPerformanceFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={isPending}
      />

      <CeoPerformanceOverviewPanel overview={overview} />

      <CeoPerformanceDepartmentsTable
        departments={departments}
        isLoading={isPending}
        onView={(departmentId) => updateFilters({ departmentId, page: 1 })}
      />

      <CeoPerformanceEmployeesTable
        employees={employees.data}
        total={employees.total}
        page={employees.page}
        pageSize={employees.pageSize}
        isLoading={isPending}
        onPageChange={(page) => updateFilters({ page })}
        onView={openEmployee}
      />

      <CeoPerformanceTopPerformers data={topPerformers} />

      <CeoPerformanceLowPerformance
        data={lowPerformance}
        onSelectEmployee={openEmployee}
        onSelectDepartment={(departmentId) => updateFilters({ departmentId, page: 1 })}
      />

      <CeoPerformanceInsights insights={insights} />

      <CeoPerformancePromotions promotions={promotions} />

      <CeoPerformanceDrawer
        employeeId={selectedEmployeeId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
