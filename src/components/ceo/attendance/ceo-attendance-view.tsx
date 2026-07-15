"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoAttendanceAnalytics } from "@/components/ceo/attendance/ceo-attendance-analytics";
import { CeoAttendanceCalendar } from "@/components/ceo/attendance/ceo-attendance-calendar";
import { CeoAttendanceDepartmentsTable } from "@/components/ceo/attendance/ceo-attendance-departments-table";
import { CeoAttendanceDrawer } from "@/components/ceo/attendance/ceo-attendance-drawer";
import { CeoAttendanceEmployeesTable } from "@/components/ceo/attendance/ceo-attendance-employees-table";
import { CeoAttendanceExceptions } from "@/components/ceo/attendance/ceo-attendance-exceptions";
import { CeoAttendanceFilters } from "@/components/ceo/attendance/ceo-attendance-filters";
import { CeoAttendanceOverviewPanel } from "@/components/ceo/attendance/ceo-attendance-overview";
import { CeoAttendanceSummary } from "@/components/ceo/attendance/ceo-attendance-summary";
import {
  fetchCeoAttendanceAnalyticsAction,
  fetchCeoAttendanceCalendarAction,
  fetchCeoAttendanceDepartmentsAction,
  fetchCeoAttendanceEmployeesAction,
  fetchCeoAttendanceExceptionsAction,
  fetchCeoAttendanceKpisAction,
  fetchCeoAttendanceOverviewAction,
  getCeoAttendanceModuleData,
} from "@/lib/ceo/actions/ceo-attendance-actions";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import type {
  CeoAttendanceListParams,
  CeoAttendancePageData,
} from "@/types/ceo-attendance";

type CeoAttendanceViewProps = CeoAttendancePageData & {
  initialFilters: CeoAttendanceListParams;
};

function defaultFilters(): CeoAttendanceListParams {
  const today = getTodayDateString();
  const [year, month] = today.split("-").map(Number);
  return {
    page: 1,
    pageSize: 10,
    month,
    year,
  };
}

export function CeoAttendanceView({
  kpis: initialKpis,
  overview: initialOverview,
  departments: initialDepartments,
  employees: initialEmployees,
  analytics: initialAnalytics,
  exceptions: initialExceptions,
  calendar: initialCalendar,
  lookups,
  initialFilters,
}: CeoAttendanceViewProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [overview, setOverview] = useState(initialOverview);
  const [departments, setDepartments] = useState(initialDepartments);
  const [employees, setEmployees] = useState(initialEmployees);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [calendar, setCalendar] = useState(initialCalendar);
  const [filters, setFilters] = useState<CeoAttendanceListParams>(initialFilters);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, []);

  const refreshScopedData = useCallback((nextFilters: CeoAttendanceListParams) => {
    startTransition(async () => {
      const [
        nextKpis,
        nextOverview,
        nextDepartments,
        nextEmployees,
        nextAnalytics,
        nextExceptions,
        nextCalendar,
      ] = await Promise.all([
        fetchCeoAttendanceKpisAction(nextFilters),
        fetchCeoAttendanceOverviewAction(nextFilters),
        fetchCeoAttendanceDepartmentsAction(nextFilters),
        fetchCeoAttendanceEmployeesAction(nextFilters),
        fetchCeoAttendanceAnalyticsAction(nextFilters),
        fetchCeoAttendanceExceptionsAction(nextFilters),
        fetchCeoAttendanceCalendarAction(nextFilters),
      ]);
      setKpis(nextKpis);
      setOverview(nextOverview);
      setDepartments(nextDepartments);
      setEmployees(nextEmployees);
      setAnalytics(nextAnalytics);
      setExceptions(nextExceptions);
      setCalendar(nextCalendar);
    });
  }, []);

  function updateFilters(next: Partial<CeoAttendanceListParams>) {
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
      const data = await getCeoAttendanceModuleData(next);
      setKpis(data.kpis);
      setOverview(data.overview);
      setDepartments(data.departments);
      setEmployees(data.employees);
      setAnalytics(data.analytics);
      setExceptions(data.exceptions);
      setCalendar(data.calendar);
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
        title="Attendance"
        description="Monitor company-wide attendance, workforce availability and attendance trends."
      />

      <CeoAttendanceSummary kpis={kpis} />

      <CeoAttendanceFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={isPending}
      />

      <CeoAttendanceOverviewPanel overview={overview} />

      <CeoAttendanceDepartmentsTable
        departments={departments}
        isLoading={isPending}
        onView={(departmentId) => updateFilters({ departmentId, page: 1 })}
      />

      <CeoAttendanceEmployeesTable
        employees={employees.data}
        total={employees.total}
        page={employees.page}
        pageSize={employees.pageSize}
        isLoading={isPending}
        onPageChange={(page) => updateFilters({ page })}
        onView={openEmployee}
      />

      <CeoAttendanceAnalytics analytics={analytics} />

      <CeoAttendanceExceptions
        exceptions={exceptions}
        onSelectEmployee={openEmployee}
        onSelectDepartment={(departmentId) => updateFilters({ departmentId, page: 1 })}
      />

      <CeoAttendanceCalendar calendar={calendar} />

      <CeoAttendanceDrawer
        employeeId={selectedEmployeeId}
        month={filters.month}
        year={filters.year}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
