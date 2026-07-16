"use client";

import { Building2, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { formatCeoPercent } from "@/components/ceo/ceo-module-primitives";
import { CeoAttendanceTrendChart } from "@/components/ceo/attendance/ceo-attendance-trend-chart";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { Button } from "@/components/common/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  fetchCeoAttendanceEmployeeDetailAction,
  fetchCeoAttendanceOverviewAction,
} from "@/lib/ceo/actions/ceo-attendance-actions";
import type { AttendanceStatus } from "@/types/attendance";
import type {
  CeoAttendanceEmployeeDetail,
  CeoAttendanceEmployeeRow,
  CeoAttendanceListParams,
  CeoAttendanceOverview,
} from "@/types/ceo-attendance";
import { cn } from "@/lib/utils";

const MONTH_LABELS: Record<string, string> = {
  "1": "January",
  "2": "February",
  "3": "March",
  "4": "April",
  "5": "May",
  "6": "June",
  "7": "July",
  "8": "August",
  "9": "September",
  "10": "October",
  "11": "November",
  "12": "December",
};

type CeoAttendanceOverviewPanelProps = {
  overview: CeoAttendanceOverview;
  employees: CeoAttendanceEmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
  selectedEmployeeId: string | null;
  periodFilters: Pick<
    CeoAttendanceListParams,
    "month" | "year" | "departmentId" | "attendanceStatus" | "employeeId"
  >;
  isLoading?: boolean;
  onSelectEmployee: (employeeId: string) => void;
  onSelectCompanyOverview: () => void;
  onPageChange: (page: number) => void;
  onViewDetail: (employeeId: string, month: number, year: number) => void;
};

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/80 px-3 py-2">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function PeriodFilters({
  month,
  year,
  disabled,
  onChange,
  trailing,
}: {
  month: number;
  year: number;
  disabled?: boolean;
  onChange: (month: number, year: number) => void;
  trailing?: React.ReactNode;
}) {
  const now = new Date();
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={String(month)}
        onValueChange={(value) => onChange(Number(value), year)}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-[7.5rem] text-xs">
          <SelectValue>{MONTH_LABELS[String(month)] ?? "Month"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(MONTH_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(year)}
        onValueChange={(value) => onChange(month, Number(value))}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-[5.5rem] text-xs">
          <SelectValue>{year}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {years.map((item) => (
            <SelectItem key={item} value={String(item)}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {trailing}
    </div>
  );
}

function CompanyOverviewRosterItem({
  selected,
  attendancePercent,
  onSelect,
}: {
  selected: boolean;
  attendancePercent: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-primary/40 bg-primary/[0.06] shadow-sm"
          : "hover:border-primary/20 hover:bg-muted/30",
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-sky-500/10 text-sky-700 dark:text-sky-400">
        <Building2 className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">Company Overview</p>
        <p className="truncate text-[11px] text-muted-foreground">
          All teams · company trend
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">
          {formatCeoPercent(attendancePercent)}
        </p>
        <span className="text-[10px] text-muted-foreground">Monthly</span>
      </div>
    </button>
  );
}

function EmployeeRosterRow({
  employee,
  selected,
  onSelect,
}: {
  employee: CeoAttendanceEmployeeRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-primary/40 bg-primary/[0.04]"
          : "hover:border-primary/20 hover:bg-muted/30",
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
        {employee.firstName.charAt(0)}
        {employee.lastName.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{employee.fullName}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {employee.departmentName ?? "No department"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">
          {formatCeoPercent(employee.attendancePercent)}
        </p>
        {employee.todayStatus === "no_record" ? (
          <span className="text-[10px] text-muted-foreground">No record</span>
        ) : (
          <AttendanceStatusBadge
            status={employee.todayStatus as AttendanceStatus}
            className="mt-0.5 scale-90"
          />
        )}
      </div>
    </button>
  );
}

function CompanyInsightPanel({
  overview,
  periodLabel,
  month,
  year,
  isRefreshing,
  onPeriodChange,
}: {
  overview: CeoAttendanceOverview;
  periodLabel: string;
  month: number;
  year: number;
  isRefreshing?: boolean;
  onPeriodChange: (month: number, year: number) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Company Overview</p>
          <p className="text-xs text-muted-foreground">{periodLabel}</p>
        </div>
        <PeriodFilters
          month={month}
          year={year}
          disabled={isRefreshing}
          onChange={onPeriodChange}
        />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatPill
          label="Monthly"
          value={formatCeoPercent(overview.monthlyAttendancePercent)}
        />
        <StatPill
          label="Yearly"
          value={formatCeoPercent(overview.yearlyAttendancePercent)}
        />
        <StatPill
          label="Avg Hours"
          value={`${overview.averageWorkingHours.toFixed(1)} hrs`}
        />
        <StatPill
          label="Overall"
          value={formatCeoPercent(overview.overallAttendancePercent)}
        />
      </div>

      <div className="mb-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{periodLabel}</span>
        {" · "}
        Monthly rate {formatCeoPercent(overview.monthlyAttendancePercent)}
        {" · "}
        Avg {overview.averageWorkingHours.toFixed(1)} hrs/day
      </div>

      <div className="min-h-0 flex-1">
        <CeoAttendanceTrendChart
          title="Company attendance trend"
          points={overview.attendanceTrend}
          barClassName="bg-gradient-to-t from-sky-600 to-cyan-400"
          shellClassName="bg-gradient-to-br from-sky-500/10 via-card to-card"
        />
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Select a team member on the left to drill into individual attendance.
      </p>
    </div>
  );
}

function EmployeeInsightPanel({
  detail,
  periodLabel,
  month,
  year,
  isRefreshing,
  onPeriodChange,
  onViewDetail,
}: {
  detail: CeoAttendanceEmployeeDetail;
  periodLabel: string;
  month: number;
  year: number;
  isRefreshing?: boolean;
  onPeriodChange: (month: number, year: number) => void;
  onViewDetail: () => void;
}) {
  const summary = detail.attendanceSummary;
  const totalDays =
    summary.presentDays + summary.absentDays + summary.lateDays + summary.leaveDays;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{detail.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {detail.employeeCode}
            {detail.departmentName ? ` · ${detail.departmentName}` : ""}
          </p>
        </div>
        <PeriodFilters
          month={month}
          year={year}
          disabled={isRefreshing}
          onChange={onPeriodChange}
          trailing={
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={onViewDetail}>
              Full profile
            </Button>
          }
        />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatPill
          label="Monthly"
          value={formatCeoPercent(detail.monthlyAttendancePercent)}
        />
        <StatPill
          label="Yearly"
          value={formatCeoPercent(detail.yearlyAttendancePercent)}
        />
        <StatPill
          label="Avg Hours"
          value={`${summary.averageHours.toFixed(1)} hrs`}
        />
        <StatPill label="Present" value={String(summary.presentDays)} />
        <StatPill label="Absent" value={String(summary.absentDays)} />
        <StatPill label="Late" value={String(summary.lateDays)} />
      </div>

      <div className="mb-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{periodLabel}</span>
        {" · "}
        Total days tracked {totalDays}
        {" · "}
        Present {summary.presentDays}
        {" · "}
        Leave {summary.leaveDays}
        {" · "}
        WFH {summary.wfhDays}
        {" · "}
        Rate {formatCeoPercent(detail.monthlyAttendancePercent)}
      </div>

      <div className="min-h-0 flex-1">
        <CeoAttendanceTrendChart
          title="Employee attendance trend"
          points={detail.attendanceTrend}
          barClassName="bg-gradient-to-t from-emerald-600 to-teal-400"
          shellClassName="bg-gradient-to-br from-emerald-500/10 via-card to-card"
        />
      </div>
    </div>
  );
}

export function CeoAttendanceOverviewPanel({
  overview,
  employees,
  total,
  page,
  pageSize,
  selectedEmployeeId,
  periodFilters,
  isLoading,
  onSelectEmployee,
  onSelectCompanyOverview,
  onPageChange,
  onViewDetail,
}: CeoAttendanceOverviewPanelProps) {
  const [chartMonth, setChartMonth] = useState(
    periodFilters.month ?? new Date().getMonth() + 1,
  );
  const [chartYear, setChartYear] = useState(
    periodFilters.year ?? new Date().getFullYear(),
  );
  const [companyOverview, setCompanyOverview] = useState(overview);
  const [detail, setDetail] = useState<CeoAttendanceEmployeeDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailPending, startDetailTransition] = useTransition();
  const [isOverviewPending, startOverviewTransition] = useTransition();

  useEffect(() => {
    setChartMonth(periodFilters.month ?? new Date().getMonth() + 1);
    setChartYear(periodFilters.year ?? new Date().getFullYear());
  }, [periodFilters.month, periodFilters.year]);

  useEffect(() => {
    setCompanyOverview(overview);
  }, [overview]);

  useEffect(() => {
    if (selectedEmployeeId) return;

    startOverviewTransition(async () => {
      const data = await fetchCeoAttendanceOverviewAction({
        departmentId: periodFilters.departmentId,
        attendanceStatus: periodFilters.attendanceStatus,
        employeeId: periodFilters.employeeId,
        month: chartMonth,
        year: chartYear,
      });
      setCompanyOverview(data);
    });
  }, [
    selectedEmployeeId,
    chartMonth,
    chartYear,
    periodFilters.departmentId,
    periodFilters.attendanceStatus,
    periodFilters.employeeId,
  ]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    startDetailTransition(async () => {
      const result = await fetchCeoAttendanceEmployeeDetailAction({
        employeeId: selectedEmployeeId,
        month: chartMonth,
        year: chartYear,
      });
      if (!result.success) {
        setDetail(null);
        setDetailError(result.message);
        return;
      }
      setDetailError(null);
      setDetail(result.data);
    });
  }, [selectedEmployeeId, chartMonth, chartYear]);

  function handlePeriodChange(month: number, year: number) {
    setChartMonth(month);
    setChartYear(year);
  }

  const periodLabel = `${MONTH_LABELS[String(chartMonth)] ?? "Month"} ${chartYear}`;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isChartRefreshing = isDetailPending || isOverviewPending;

  return (
    <section className="w-full rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Workforce Attendance</h2>
        <p className="text-xs text-muted-foreground">
          Click Company Overview to return to company view, or select a person for their trend.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 lg:items-stretch">
        <div className="flex h-[28rem] flex-col border-b p-3 lg:border-r lg:border-b-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background/80">
            <div className="shrink-0 border-b bg-card/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <CompanyOverviewRosterItem
                selected={!selectedEmployeeId}
                attendancePercent={companyOverview.monthlyAttendancePercent}
                onSelect={onSelectCompanyOverview}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading employees…
                </div>
              ) : employees.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No employees match the current filters.
                </p>
              ) : (
                <div className="space-y-2">
                  {employees.map((employee) => (
                    <EmployeeRosterRow
                      key={employee.employeeId}
                      employee={employee}
                      selected={selectedEmployeeId === employee.employeeId}
                      onSelect={() => onSelectEmployee(employee.employeeId)}
                    />
                  ))}
                </div>
              )}
            </div>

            {total > pageSize ? (
              <div className="flex shrink-0 items-center justify-between gap-2 border-t px-2 py-2">
                <p className="text-[11px] text-muted-foreground">
                  {employees.length} of {total} employees
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isLoading}
                    onClick={() => onPageChange(page - 1)}
                  >
                    Prev
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    {page}/{totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isLoading}
                    onClick={() => onPageChange(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "flex h-[28rem] flex-col overflow-y-auto p-4 transition-opacity",
            isChartRefreshing && "opacity-70",
          )}
        >
          {selectedEmployeeId ? (
            isDetailPending && !detail ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading employee trend…
              </div>
            ) : detailError ? (
              <p className="py-8 text-center text-sm text-destructive">{detailError}</p>
            ) : detail ? (
              <EmployeeInsightPanel
                detail={detail}
                periodLabel={periodLabel}
                month={chartMonth}
                year={chartYear}
                isRefreshing={isChartRefreshing}
                onPeriodChange={handlePeriodChange}
                onViewDetail={() =>
                  onViewDetail(selectedEmployeeId, chartMonth, chartYear)
                }
              />
            ) : null
          ) : (
            <CompanyInsightPanel
              overview={companyOverview}
              periodLabel={periodLabel}
              month={chartMonth}
              year={chartYear}
              isRefreshing={isChartRefreshing}
              onPeriodChange={handlePeriodChange}
            />
          )}
        </div>
      </div>
    </section>
  );
}
