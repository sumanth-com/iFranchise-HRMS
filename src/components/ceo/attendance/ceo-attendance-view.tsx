"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoAttendanceDrawer } from "@/components/ceo/attendance/ceo-attendance-drawer";
import { CeoAttendanceFilters } from "@/components/ceo/attendance/ceo-attendance-filters";
import { CeoAttendanceInsights } from "@/components/ceo/attendance/ceo-attendance-insights";
import { CeoAttendanceOverviewPanel } from "@/components/ceo/attendance/ceo-attendance-overview";
import { CeoAttendanceSummary } from "@/components/ceo/attendance/ceo-attendance-summary";
import {
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
    pageSize: 15,
    month,
    year,
  };
}

export function CeoAttendanceView({
  kpis: initialKpis,
  overview: initialOverview,
  employees: initialEmployees,
  exceptions: initialExceptions,
  lookups,
  initialFilters,
}: CeoAttendanceViewProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [overview, setOverview] = useState(initialOverview);
  const [employees, setEmployees] = useState(initialEmployees);
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [filters, setFilters] = useState<CeoAttendanceListParams>(initialFilters);
  const [overviewEmployeeId, setOverviewEmployeeId] = useState<string | null>(
    initialFilters.employeeId ?? null,
  );
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<string | null>(null);
  const [drawerMonth, setDrawerMonth] = useState(initialFilters.month);
  const [drawerYear, setDrawerYear] = useState(initialFilters.year);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setOverviewEmployeeId(filters.employeeId ?? null);
  }, [filters.employeeId]);

  useEffect(() => {
    if (!overviewEmployeeId) return;
    const stillVisible = employees.data.some(
      (employee) => employee.employeeId === overviewEmployeeId,
    );
    if (!stillVisible && !isPending) {
      setOverviewEmployeeId(null);
    }
  }, [employees.data, overviewEmployeeId, isPending]);

  const refreshScopedData = useCallback((nextFilters: CeoAttendanceListParams) => {
    startTransition(async () => {
      const [nextKpis, nextOverview, nextEmployees, nextExceptions] = await Promise.all([
        fetchCeoAttendanceKpisAction(nextFilters),
        fetchCeoAttendanceOverviewAction(nextFilters),
        fetchCeoAttendanceEmployeesAction(nextFilters),
        fetchCeoAttendanceExceptionsAction(nextFilters),
      ]);
      setKpis(nextKpis);
      setOverview(nextOverview);
      setEmployees(nextEmployees);
      setExceptions(nextExceptions);
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
    setOverviewEmployeeId(null);
    startTransition(async () => {
      const data = await getCeoAttendanceModuleData(next);
      setKpis(data.kpis);
      setOverview(data.overview);
      setEmployees(data.employees);
      setExceptions(data.exceptions);
    });
  }

  function openDrawer(employeeId: string, month?: number, year?: number) {
    setDrawerEmployeeId(employeeId);
    setDrawerMonth(month ?? filters.month);
    setDrawerYear(year ?? filters.year);
    setDrawerOpen(true);
  }

  function selectOverviewEmployee(employeeId: string) {
    setOverviewEmployeeId(employeeId);
  }

  function selectCompanyOverview() {
    setOverviewEmployeeId(null);
    if (filters.employeeId) {
      updateFilters({ employeeId: undefined, page: 1 });
    }
  }

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto scroll-smooth p-3 pb-8 md:gap-4 md:p-4 md:pb-10 lg:p-5">
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

      <CeoAttendanceOverviewPanel
        overview={overview}
        employees={employees.data}
        total={employees.total}
        page={employees.page}
        pageSize={employees.pageSize}
        selectedEmployeeId={overviewEmployeeId}
        periodFilters={{
          month: filters.month,
          year: filters.year,
          departmentId: filters.departmentId,
          attendanceStatus: filters.attendanceStatus,
          employeeId: filters.employeeId,
        }}
        isLoading={isPending}
        onSelectEmployee={selectOverviewEmployee}
        onSelectCompanyOverview={selectCompanyOverview}
        onPageChange={(page) => updateFilters({ page })}
        onViewDetail={openDrawer}
      />

      <CeoAttendanceInsights
        kpis={kpis}
        overview={overview}
        exceptions={exceptions}
        initialMonth={filters.month}
        initialYear={filters.year}
      />

      <CeoAttendanceDrawer
        employeeId={drawerEmployeeId}
        month={drawerMonth}
        year={drawerYear}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
