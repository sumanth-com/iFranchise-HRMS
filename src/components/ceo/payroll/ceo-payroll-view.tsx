"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoPayrollAnalytics } from "@/components/ceo/payroll/ceo-payroll-analytics";
import { CeoPayrollDepartmentsTable } from "@/components/ceo/payroll/ceo-payroll-departments-table";
import { CeoPayrollDrawer } from "@/components/ceo/payroll/ceo-payroll-drawer";
import { CeoPayrollEmployeesTable } from "@/components/ceo/payroll/ceo-payroll-employees-table";
import { CeoPayrollFilters } from "@/components/ceo/payroll/ceo-payroll-filters";
import { CeoPayrollHistoryTable } from "@/components/ceo/payroll/ceo-payroll-history-table";
import { CeoPayrollInsights } from "@/components/ceo/payroll/ceo-payroll-insights";
import { CeoPayrollOverviewPanel } from "@/components/ceo/payroll/ceo-payroll-overview";
import { CeoPayrollSummary } from "@/components/ceo/payroll/ceo-payroll-summary";
import {
  fetchCeoPayrollAnalyticsAction,
  fetchCeoPayrollDepartmentsAction,
  fetchCeoPayrollEmployeesAction,
  fetchCeoPayrollHistoryAction,
  fetchCeoPayrollInsightsAction,
  fetchCeoPayrollKpisAction,
  fetchCeoPayrollOverviewAction,
  getCeoPayrollModuleData,
} from "@/lib/ceo/actions/ceo-payroll-actions";
import type {
  CeoPayrollEmployeeRow,
  CeoPayrollHistoryRow,
  CeoPayrollListParams,
  CeoPayrollPageData,
} from "@/types/ceo-payroll";

type CeoPayrollViewProps = CeoPayrollPageData & {
  initialFilters: CeoPayrollListParams;
};

function defaultFilters(): CeoPayrollListParams {
  const now = new Date();
  return {
    page: 1,
    pageSize: 10,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function CeoPayrollView({
  kpis: initialKpis,
  overview: initialOverview,
  employees: initialEmployees,
  analytics: initialAnalytics,
  departments: initialDepartments,
  history: initialHistory,
  insights: initialInsights,
  lookups,
  initialFilters,
}: CeoPayrollViewProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [overview, setOverview] = useState(initialOverview);
  const [employees, setEmployees] = useState(initialEmployees);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [departments, setDepartments] = useState(initialDepartments);
  const [history, setHistory] = useState(initialHistory);
  const [insights, setInsights] = useState(initialInsights);
  const [filters, setFilters] = useState<CeoPayrollListParams>(initialFilters);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedPayrollItemId, setSelectedPayrollItemId] = useState<string | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, []);

  const refreshScopedData = useCallback((nextFilters: CeoPayrollListParams) => {
    startTransition(async () => {
      const [
        nextKpis,
        nextOverview,
        nextEmployees,
        nextAnalytics,
        nextDepartments,
        nextHistory,
        nextInsights,
      ] = await Promise.all([
        fetchCeoPayrollKpisAction(nextFilters),
        fetchCeoPayrollOverviewAction(nextFilters),
        fetchCeoPayrollEmployeesAction(nextFilters),
        fetchCeoPayrollAnalyticsAction(nextFilters),
        fetchCeoPayrollDepartmentsAction(nextFilters),
        fetchCeoPayrollHistoryAction(nextFilters),
        fetchCeoPayrollInsightsAction(nextFilters),
      ]);
      setKpis(nextKpis);
      setOverview(nextOverview);
      setEmployees(nextEmployees);
      setAnalytics(nextAnalytics);
      setDepartments(nextDepartments);
      setHistory(nextHistory);
      setInsights(nextInsights);
    });
  }, []);

  function updateFilters(next: Partial<CeoPayrollListParams>) {
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
    const next = defaultFilters();
    setFilters(next);
    startTransition(async () => {
      const data = await getCeoPayrollModuleData(next);
      setKpis(data.kpis);
      setOverview(data.overview);
      setEmployees(data.employees);
      setAnalytics(data.analytics);
      setDepartments(data.departments);
      setHistory(data.history);
      setInsights(data.insights);
    });
  }

  function openEmployee(row: CeoPayrollEmployeeRow) {
    setSelectedEmployeeId(row.employeeId);
    setSelectedPayrollItemId(row.payrollItemId);
    setDrawerOpen(true);
  }

  function openHistory(row: CeoPayrollHistoryRow) {
    updateFilters({
      month: row.month,
      year: row.year,
      page: 1,
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <CeoBackToDashboard />
      <CeoModulePageHeader
        title="Payroll"
        description="Monitor company-wide payroll, salary expenses, payroll trends, benefits, and financial workforce insights."
      />

      <CeoPayrollSummary kpis={kpis} />

      <CeoPayrollFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={isPending}
      />

      <CeoPayrollOverviewPanel overview={overview} />

      <CeoPayrollEmployeesTable
        employees={employees.data}
        total={employees.total}
        page={employees.page}
        pageSize={employees.pageSize}
        isLoading={isPending}
        onPageChange={(page) => updateFilters({ page })}
        onView={openEmployee}
      />

      <CeoPayrollAnalytics analytics={analytics} />

      <CeoPayrollDepartmentsTable departments={departments} isLoading={isPending} />

      <CeoPayrollHistoryTable
        history={history}
        isLoading={isPending}
        onView={openHistory}
      />

      <CeoPayrollInsights insights={insights} />

      <CeoPayrollDrawer
        employeeId={selectedEmployeeId}
        payrollItemId={selectedPayrollItemId}
        month={filters.month}
        year={filters.year}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
