"use client";

import { useCallback, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoPayrollAnalytics } from "@/components/ceo/payroll/ceo-payroll-analytics";
import { CeoPayrollDrawer } from "@/components/ceo/payroll/ceo-payroll-drawer";
import { CeoPayrollEmployeesTable } from "@/components/ceo/payroll/ceo-payroll-employees-table";
import { CeoPayrollFilters } from "@/components/ceo/payroll/ceo-payroll-filters";
import { CeoPayrollPanels } from "@/components/ceo/payroll/ceo-payroll-panels";
import { CeoPayrollSummary } from "@/components/ceo/payroll/ceo-payroll-summary";
import {
  fetchCeoPayrollAnalyticsAction,
  fetchCeoPayrollDepartmentsAction,
  fetchCeoPayrollEmployeesAction,
  fetchCeoPayrollInsightsAction,
  fetchCeoPayrollKpisAction,
  fetchCeoPayrollOverviewAction,
  getCeoPayrollModuleData,
} from "@/lib/ceo/actions/ceo-payroll-actions";
import type {
  CeoPayrollEmployeeRow,
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
  insights: initialInsights,
  lookups,
  initialFilters,
}: CeoPayrollViewProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [overview, setOverview] = useState(initialOverview);
  const [employees, setEmployees] = useState(initialEmployees);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [departments, setDepartments] = useState(initialDepartments);
  const [insights, setInsights] = useState(initialInsights);
  const [filters, setFilters] = useState<CeoPayrollListParams>(initialFilters);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedPayrollItemId, setSelectedPayrollItemId] = useState<string | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refreshScopedData = useCallback((nextFilters: CeoPayrollListParams) => {
    startTransition(async () => {
      const [
        nextKpis,
        nextOverview,
        nextEmployees,
        nextAnalytics,
        nextDepartments,
        nextInsights,
      ] = await Promise.all([
        fetchCeoPayrollKpisAction(nextFilters),
        fetchCeoPayrollOverviewAction(nextFilters),
        fetchCeoPayrollEmployeesAction(nextFilters),
        fetchCeoPayrollAnalyticsAction(nextFilters),
        fetchCeoPayrollDepartmentsAction(nextFilters),
        fetchCeoPayrollInsightsAction(nextFilters),
      ]);
      setKpis(nextKpis);
      setOverview(nextOverview);
      setEmployees(nextEmployees);
      setAnalytics(nextAnalytics);
      setDepartments(nextDepartments);
      setInsights(nextInsights);
    });
  }, []);

  function updateFilters(next: Partial<CeoPayrollListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
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
      setInsights(data.insights);
    });
  }

  function openEmployee(row: CeoPayrollEmployeeRow) {
    setSelectedEmployeeId(row.employeeId);
    setSelectedPayrollItemId(row.payrollItemId);
    setDrawerOpen(true);
  }

  const hasScopedFilters = Boolean(
    filters.employeeId ||
      filters.departmentId ||
      filters.employmentTypeId ||
      filters.payrollStatus,
  );

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto scroll-smooth p-3 pb-8 md:gap-4 md:p-4 md:pb-10 lg:p-5">
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

      <CeoPayrollPanels
        departments={departments}
        overview={overview}
        analytics={analytics}
        insights={insights}
      />

      <CeoPayrollAnalytics analytics={analytics} />

      {hasScopedFilters ? (
        <CeoPayrollEmployeesTable
          employees={employees.data}
          total={employees.total}
          page={employees.page}
          pageSize={employees.pageSize}
          isLoading={isPending}
          onPageChange={(page) => updateFilters({ page })}
          onView={openEmployee}
        />
      ) : null}

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
