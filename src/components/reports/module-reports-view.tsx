"use client";

import {
  CalendarCheck,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Laptop,
  Loader2,
  LogOut,
  Play,
  Target,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { getMonthSelectItems, getYearSelectItems } from "@/components/payroll/select-utils";
import { canExportReports } from "@/lib/reports/constants";
import { ASSET_ACTIVITY_FILTER_ITEMS } from "@/lib/assets/constants";
import { exportGeneratedReportAction, runReportAction } from "@/lib/reports/actions";
import { defaultDateRangeForCurrentMonth } from "@/lib/reports/services/reports-utils";
import type {
  ReportExportFormat,
  ReportFilters,
  ReportKey,
  ReportModuleKey,
  ReportResult,
  ReportsLookups,
} from "@/types/reports";

type Definition = {
  key: ReportKey;
  title: string;
  description: string;
  purpose: string;
  filterSummary: string;
  exportFormats: ReportExportFormat[];
  usageInformation: string;
};

type Props = {
  module: ReportModuleKey;
  definitions: Definition[];
  lookups: ReportsLookups;
  permissionCodes: string[];
  initialReportKey?: ReportKey;
  initialResult?: ReportResult | null;
  defaultFilters?: ReportFilters;
};

const ALL_OPTION = { value: "__all__", label: "All" };

const GENERATE_LABEL = "Generate";

function dedupeByValue<T extends { value: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.value)) continue;
    seen.add(item.value);
    out.push(item);
  }
  return out;
}

const MODULE_STATUS_OPTIONS: Partial<
  Record<ReportModuleKey, { value: string; label: string }[]>
> = {
  hr: [
    { value: "active", label: "Active" },
    { value: "probation", label: "Probation" },
    { value: "on_leave", label: "On Leave" },
    { value: "resigned", label: "Resigned" },
    { value: "terminated", label: "Terminated" },
  ],
  attendance: [
    { value: "present", label: "Present" },
    { value: "absent", label: "Absent" },
    { value: "late", label: "Late" },
    { value: "half_day", label: "Half Day" },
    { value: "holiday", label: "Holiday" },
    { value: "week_off", label: "Week Off" },
  ],
  performance: [
    { value: "draft", label: "Draft" },
    { value: "not_started", label: "Not Started" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "overdue", label: "Overdue" },
  ],
  recruitment: [
    { value: "open", label: "Open" },
    { value: "draft", label: "Draft" },
    { value: "on_hold", label: "On Hold" },
    { value: "filled", label: "Filled" },
    { value: "closed", label: "Closed" },
  ],
  assets: [
    { value: "available", label: "Available" },
    { value: "assigned", label: "Assigned" },
    { value: "maintenance", label: "Maintenance" },
    { value: "retired", label: "Retired" },
  ],
  exit: [
    { value: "submitted", label: "Submitted" },
    { value: "approved", label: "Approved" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "withdrawn", label: "Withdrawn" },
  ],
};

const MODULE_TITLES: Record<ReportModuleKey, string> = {
  hr: "HR Reports",
  attendance: "Attendance Reports",
  leave: "Leave Reports",
  payroll: "Payroll Reports",
  performance: "Performance Reports",
  recruitment: "Recruitment Reports",
  assets: "Asset Reports",
  exit: "Exit Reports",
};

const MODULE_SUBTITLES: Record<ReportModuleKey, string> = {
  hr: "Review workforce, joining, and probation data for the selected period.",
  attendance: "Track daily presence, late marks, and working hours across the selected period.",
  leave: "Monitor leave balances and utilization for the selected period.",
  payroll: "Review salary, deductions, bonuses, and net pay for the selected month.",
  performance: "Track KPIs, goals, reviews, and promotion readiness for the selected month.",
  recruitment: "Review open roles, pipeline, offers, and hiring progress for the selected period.",
  assets: "Track asset actions, requests, and assignments for the selected period.",
  exit: "Review resignations, attrition, and settlement status for the selected period.",
};

const MODULE_EMPTY_STATE: Record<
  ReportModuleKey,
  { title: string; description: string }
> = {
  hr: {
    title: "Workforce records will appear here",
    description:
      "Choose a report type and date range, then generate the report to view and export HR data.",
  },
  attendance: {
    title: "Attendance records will appear here",
    description:
      "Set the From and To dates, optionally choose status, department, or employee, then generate the report to view and export attendance.",
  },
  leave: {
    title: "Leave records will appear here",
    description:
      "Optionally filter by employee or leave type, then generate the report to view and export leave data.",
  },
  payroll: {
    title: "Payroll records will appear here",
    description:
      "Choose a report type, Month, and Year, then click Generate to view and export payroll.",
  },
  performance: {
    title: "Performance records will appear here",
    description:
      "Choose a report type, Month, and Year, then click Generate to view and export performance data.",
  },
  recruitment: {
    title: "Recruitment records will appear here",
    description:
      "Choose a report type and date range, then generate the report to view and export hiring data.",
  },
  assets: {
    title: "Asset records will appear here",
    description:
      "Choose an action and date range, optionally filter by employee, then generate the report to view and export asset activity.",
  },
  exit: {
    title: "Exit records will appear here",
    description:
      "Choose a report type and date range, then generate the report to view and export offboarding data.",
  },
};

const MODULE_NO_DATA: Record<ReportModuleKey, { title: string; description: string }> = {
  hr: {
    title: "No workforce records found",
    description: "Try a different report type or date range, then click Generate again.",
  },
  attendance: {
    title: "No attendance records found",
    description:
      "Try a different date range, status, department, or employee, then click Generate again.",
  },
  leave: {
    title: "No leave records found",
    description: "Try a different employee or leave type, then click Generate again.",
  },
  payroll: {
    title: "No payroll records found",
    description: "Try a different report type, month, year, or employee, then click Generate again.",
  },
  performance: {
    title: "No performance records found",
    description: "Try a different report type, month, or year, then click Generate again.",
  },
  recruitment: {
    title: "No recruitment records found",
    description: "Try a different report type or date range, then click Generate again.",
  },
  assets: {
    title: "No asset records found",
    description: "Try a different action, date range, or employee, then click Generate again.",
  },
  exit: {
    title: "No exit records found",
    description: "Try a different report type or date range, then click Generate again.",
  },
};

const GENERATE_FAILED = {
  title: "Unable to generate report",
  description: "Adjust the filters and click Generate again to generate this report.",
};

const NEED_PERIOD = {
  title: "Month and Year required",
  description: "Select Month and Year, then click Generate to generate this report.",
};

const MODULE_EMPTY_ICONS: Record<ReportModuleKey, typeof Users> = {
  hr: Users,
  attendance: CalendarCheck,
  leave: CalendarDays,
  payroll: Wallet,
  performance: Target,
  recruitment: UserPlus,
  assets: Laptop,
  exit: LogOut,
};

function downloadBase64(filename: string, mimeType: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showFiltersFor(module: ReportModuleKey) {
  return {
    reportType: module !== "attendance" && module !== "leave" && module !== "assets",
    assetAction: module === "assets",
    dates: module !== "payroll" && module !== "performance",
    monthYear: module === "payroll" || module === "performance",
    status: module !== "leave" && module !== "payroll" && module !== "assets",
    department: module === "attendance",
    designation: module === "hr",
    employee: module !== "hr" && module !== "recruitment",
    leaveType: module === "leave",
  };
}

function monthToDateRange(month: number, year: number) {
  const paddedMonth = String(month).padStart(2, "0");
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();

  // If user is viewing the current month, show records only "till now".
  // For other months, keep full month range.
  const dateTo = isCurrentMonth
    ? now.toISOString().slice(0, 10)
    : `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`;
  return {
    dateFrom: `${year}-${paddedMonth}-01`,
    dateTo,
  };
}

function buildFilters(
  dateFrom: string,
  dateTo: string,
  departmentId: string,
  designationId: string,
  employeeId: string,
  leaveTypeId: string,
  status: string,
  assetAction?: string,
  month?: number,
  year?: number,
): ReportFilters {
  const hasPeriod = Boolean(month && year);
  const period = hasPeriod ? monthToDateRange(month!, year!) : { dateFrom, dateTo };

  return {
    dateFrom: period.dateFrom || undefined,
    dateTo: period.dateTo || undefined,
    departmentId:
      departmentId && departmentId !== ALL_OPTION.value ? departmentId : undefined,
    designationId:
      designationId && designationId !== ALL_OPTION.value ? designationId : undefined,
    employeeId: employeeId && employeeId !== ALL_OPTION.value ? employeeId : undefined,
    leaveTypeId: leaveTypeId && leaveTypeId !== ALL_OPTION.value ? leaveTypeId : undefined,
    status: status && status !== ALL_OPTION.value ? status : undefined,
    assetAction: assetAction && assetAction !== "all" ? assetAction : undefined,
    month: hasPeriod ? month : undefined,
    year: hasPeriod ? year : undefined,
  };
}

type ReportNotice = "idle" | "need-period" | "failed" | "empty";

export function ModuleReportsView({
  module,
  definitions,
  lookups,
  permissionCodes,
  initialReportKey,
  initialResult = null,
  defaultFilters,
}: Props) {
  const canExport = canExportReports(permissionCodes);
  const periodDefault = defaultDateRangeForCurrentMonth();
  const [isPending, startTransition] = useTransition();
  const [reportKey, setReportKey] = useState<ReportKey>(
    module === "attendance"
      ? "attendance_daily"
      : module === "leave"
        ? "leave_balance"
        : module === "assets"
          ? "assets_assigned"
          : (initialReportKey ?? definitions[0]?.key ?? "hr_employee_master"),
  );
  const [result, setResult] = useState<ReportResult | null>(initialResult);
  const [notice, setNotice] = useState<ReportNotice>("idle");
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters | null>(
    initialResult ? defaultFilters ?? null : null,
  );
  const [dateFrom, setDateFrom] = useState(
    defaultFilters?.dateFrom ?? periodDefault.dateFrom,
  );
  const [dateTo, setDateTo] = useState(defaultFilters?.dateTo ?? periodDefault.dateTo);
  const [departmentId, setDepartmentId] = useState(
    defaultFilters?.departmentId ?? ALL_OPTION.value,
  );
  const [designationId, setDesignationId] = useState(
    defaultFilters?.designationId ?? ALL_OPTION.value,
  );
  const [employeeId, setEmployeeId] = useState(
    defaultFilters?.employeeId ?? ALL_OPTION.value,
  );
  const [leaveTypeId, setLeaveTypeId] = useState(
    defaultFilters?.leaveTypeId ?? ALL_OPTION.value,
  );
  const [status, setStatus] = useState(defaultFilters?.status ?? ALL_OPTION.value);
  const [assetAction, setAssetAction] = useState(defaultFilters?.assetAction ?? "all");
  const [month, setMonth] = useState(
    defaultFilters?.month ? String(defaultFilters.month) : String(periodDefault.month),
  );
  const [year, setYear] = useState(
    defaultFilters?.year ? String(defaultFilters.year) : String(periodDefault.year),
  );

  const filterVisibility = showFiltersFor(module);
  const showStatusFilter = module !== "leave" && module !== "payroll";
  const statusOptions = showStatusFilter ? (MODULE_STATUS_OPTIONS[module] ?? []) : [];

  const departmentItems = useMemo(
    () =>
      dedupeByValue([
        { value: ALL_OPTION.value, label: "All departments" },
        ...lookups.departments.map((d) => ({ value: d.id, label: d.label })),
      ]),
    [lookups.departments],
  );
  const designationItems = useMemo(
    () =>
      dedupeByValue([
        { value: ALL_OPTION.value, label: "All designations" },
        ...lookups.designations.map((d) => ({ value: d.id, label: d.label })),
      ]),
    [lookups.designations],
  );
  const employeeItems = useMemo(
    () =>
      dedupeByValue([
        { value: ALL_OPTION.value, label: "All employees" },
        ...lookups.employees.map((e) => ({ value: e.id, label: e.label })),
      ]),
    [lookups.employees],
  );
  const reportItems = useMemo(
    () => dedupeByValue(definitions.map((d) => ({ value: d.key, label: d.title }))),
    [definitions],
  );
  const leaveTypeItems = useMemo(
    () =>
      dedupeByValue([
        { value: ALL_OPTION.value, label: "All leave types" },
        ...lookups.leaveTypes.map((item) => ({ value: item.id, label: item.label })),
      ]),
    [lookups.leaveTypes],
  );
  const statusItems = useMemo(
    () =>
      dedupeByValue([
        { value: ALL_OPTION.value, label: "All statuses" },
        ...statusOptions,
      ]),
    [statusOptions],
  );
  const assetActionItems = useMemo(
    () =>
      ASSET_ACTIVITY_FILTER_ITEMS.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    [],
  );
  const monthItems = useMemo(() => getMonthSelectItems(), []);
  const yearItems = useMemo(() => {
    const current = new Date().getFullYear();
    return getYearSelectItems([current - 1, current, current + 1]);
  }, []);

  function currentFilters() {
    const selectedMonth = month ? Number(month) : undefined;
    const selectedYear = year ? Number(year) : undefined;
    return buildFilters(
      dateFrom,
      dateTo,
      departmentId,
      designationId,
      employeeId,
      leaveTypeId,
      filterVisibility.status && showStatusFilter ? status : ALL_OPTION.value,
      filterVisibility.assetAction ? assetAction : undefined,
      filterVisibility.monthYear ? selectedMonth : undefined,
      filterVisibility.monthYear ? selectedYear : undefined,
    );
  }

  function clearGenerated() {
    setResult(null);
    setAppliedFilters(null);
    setNotice("idle");
    setFailedMessage(null);
  }

  function changeFilter(next: string, current: string, setValue: (value: string) => void) {
    if (next === current) return;
    setValue(next);
    clearGenerated();
  }

  function onRun() {
    if (filterVisibility.monthYear && (!month || !year)) {
      setResult(null);
      setAppliedFilters(null);
      setNotice("need-period");
      return;
    }

    const filters = currentFilters();
    startTransition(async () => {
      const res = await runReportAction(reportKey, filters);
      if (!res.success) {
        setResult(null);
        setAppliedFilters(null);
        setNotice("failed");
        setFailedMessage(res.message);
        return;
      }
      setAppliedFilters(filters);
      setResult(res.data);
      setNotice(res.data.total === 0 ? "empty" : "idle");
      setFailedMessage(null);
    });
  }

  function onExport(format: ReportExportFormat) {
    if (!result || result.total === 0 || result.key !== reportKey) return;

    startTransition(async () => {
      const res = await exportGeneratedReportAction(
        result,
        format,
        appliedFilters?.dateFrom,
        appliedFilters?.dateTo,
      );
      if (!res.success) return;
      downloadBase64(res.filename, res.mimeType, res.contentBase64);
    });
  }

  const emptyState = MODULE_EMPTY_STATE[module] ?? {
    title: "Report results will appear here",
    description: "Choose filters and click Generate to view and export data.",
  };
  const EmptyIcon = MODULE_EMPTY_ICONS[module] ?? CalendarDays;
  const canDownload = Boolean(result && result.total > 0 && result.key === reportKey);
  const showTable = Boolean(result && result.total > 0 && result.key === reportKey);
  const panelCopy =
    notice === "failed"
      ? {
          ...GENERATE_FAILED,
          description: failedMessage
            ? `${GENERATE_FAILED.description} ${failedMessage}`
            : GENERATE_FAILED.description,
        }
      : notice === "need-period"
        ? NEED_PERIOD
        : notice === "empty"
          ? (MODULE_NO_DATA[module] ?? GENERATE_FAILED)
          : emptyState;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{MODULE_TITLES[module]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{MODULE_SUBTITLES[module]}</p>
      </div>

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
        {filterVisibility.reportType ? (
          <div className="w-[170px] shrink-0">
            <LabeledSelect
              items={reportItems}
              value={reportKey}
              onValueChange={(value) => {
                changeFilter(value, reportKey, (next) => setReportKey(next as ReportKey));
              }}
              placeholder="Report type"
              triggerClassName="h-8 w-full"
              contentClassName="w-max min-w-[var(--anchor-width)] max-w-[22rem] max-h-[min(18rem,calc(100dvh-8rem))]"
            />
          </div>
        ) : null}

        {filterVisibility.assetAction ? (
          <div className="w-[150px] shrink-0">
            <LabeledSelect
              items={assetActionItems}
              value={assetAction}
              onValueChange={(value) => changeFilter(value, assetAction, setAssetAction)}
              placeholder="Action"
              triggerClassName="h-8 w-full"
              contentClassName="w-max min-w-[var(--anchor-width)] max-w-[16rem] max-h-[min(18rem,calc(100dvh-8rem))]"
            />
          </div>
        ) : null}

        {filterVisibility.dates ? (
          <>
            <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border bg-background px-2">
              <span className="shrink-0 text-xs text-muted-foreground">From</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => changeFilter(e.target.value, dateFrom, setDateFrom)}
                className="h-7 w-[124px] border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                aria-label="From date"
              />
            </div>
            <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border bg-background px-2">
              <span className="shrink-0 text-xs text-muted-foreground">To</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => changeFilter(e.target.value, dateTo, setDateTo)}
                className="h-7 w-[124px] border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                aria-label="To date"
              />
            </div>
          </>
        ) : null}

        {filterVisibility.monthYear ? (
          <>
            <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border bg-background pl-2 pr-1">
              <span className="shrink-0 text-xs text-muted-foreground">Month</span>
              <LabeledSelect
                items={monthItems}
                value={month}
                onValueChange={(value) => changeFilter(value, month, setMonth)}
                placeholder="Select"
                triggerClassName="h-7 min-w-[7rem] border-0 bg-transparent px-1 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
              />
            </div>
            <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border bg-background pl-2 pr-1">
              <span className="shrink-0 text-xs text-muted-foreground">Year</span>
              <LabeledSelect
                items={yearItems}
                value={year}
                onValueChange={(value) => changeFilter(value, year, setYear)}
                placeholder="Select"
                triggerClassName="h-7 min-w-[4.5rem] border-0 bg-transparent px-1 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
              />
            </div>
          </>
        ) : null}

        {showStatusFilter && filterVisibility.status ? (
          <div className="w-[130px] shrink-0">
            <LabeledSelect
              items={statusItems}
              value={status}
              onValueChange={(value) => changeFilter(value, status, setStatus)}
              placeholder="All statuses"
              triggerClassName="h-8 w-full"
              contentClassName="w-max min-w-[var(--anchor-width)] max-w-[16rem] max-h-[min(18rem,calc(100dvh-8rem))]"
            />
          </div>
        ) : null}
        {filterVisibility.department ? (
          <div className="w-[150px] shrink-0">
            <LabeledSelect
              items={departmentItems}
              value={departmentId}
              onValueChange={(value) => changeFilter(value, departmentId, setDepartmentId)}
              placeholder="All departments"
              triggerClassName="h-8 w-full"
              contentClassName="w-max min-w-[16rem] max-w-[min(22rem,calc(100vw-2rem))] max-h-[min(18rem,calc(100dvh-8rem))]"
            />
          </div>
        ) : null}
        {filterVisibility.designation ? (
          <div className="w-[150px] shrink-0">
            <LabeledSelect
              items={designationItems}
              value={designationId}
              onValueChange={(value) => changeFilter(value, designationId, setDesignationId)}
              placeholder="All designations"
              triggerClassName="h-8 w-full"
              align="end"
              contentClassName="w-max min-w-[18rem] max-w-[min(24rem,calc(100vw-2rem))] max-h-[min(18rem,calc(100dvh-8rem))]"
            />
          </div>
        ) : null}
        {filterVisibility.employee ? (
          <div className="w-[180px] shrink-0">
            <LabeledSelect
              items={employeeItems}
              value={employeeId}
              onValueChange={(value) => changeFilter(value, employeeId, setEmployeeId)}
              placeholder="All employees"
              triggerClassName="h-8 w-full"
              contentClassName="w-max min-w-[18rem] max-w-[min(24rem,calc(100vw-2rem))] max-h-[min(18rem,calc(100dvh-8rem))]"
            />
          </div>
        ) : null}
        {filterVisibility.leaveType ? (
          <div className="w-[160px] shrink-0">
            <LabeledSelect
              items={leaveTypeItems}
              value={leaveTypeId}
              onValueChange={(value) => changeFilter(value, leaveTypeId, setLeaveTypeId)}
              placeholder="All leave types"
              triggerClassName="h-8 w-full"
              contentClassName="w-max min-w-[18rem] max-w-[min(24rem,calc(100vw-2rem))] max-h-[min(18rem,calc(100dvh-8rem))]"
            />
          </div>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button onClick={onRun} disabled={isPending} size="sm">
            {isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Play className="mr-1.5 size-3.5" />
            )}
            {GENERATE_LABEL}
          </Button>
          {canExport ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canDownload || isPending}
                onClick={() => onExport("excel")}
              >
                <FileSpreadsheet className="mr-1.5 size-3.5" />
                Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canDownload || isPending}
                onClick={() => onExport("pdf")}
              >
                <FileText className="mr-1.5 size-3.5" />
                PDF
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {showTable && result ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {result.title} · {result.total} row{result.total === 1 ? "" : "s"}
            {appliedFilters?.month && appliedFilters?.year
              ? ` · ${String(appliedFilters.month).padStart(2, "0")}/${appliedFilters.year}`
              : appliedFilters?.dateFrom && appliedFilters?.dateTo
                ? ` · ${appliedFilters.dateFrom} to ${appliedFilters.dateTo}`
                : ""}
            {" · Generated "}
            {new Date(result.generatedAt).toLocaleString("en-IN")}
          </p>

          <div className="overflow-auto rounded-xl border bg-card max-h-[min(70vh,calc(100dvh-16rem))] [scrollbar-gutter:stable]">
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 text-left text-xs tracking-wide text-muted-foreground uppercase backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                <tr className="border-b">
                  {result.columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 font-medium whitespace-nowrap">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b last:border-b-0 hover:bg-muted/20">
                    {result.columns.map((col) => {
                      const value = row[col.key];
                      return (
                        <td key={col.key} className="px-4 py-2.5 whitespace-nowrap">
                          {value == null || value === "" ? "—" : String(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<EmptyIcon className="size-6" />}
          title={panelCopy.title}
          description={panelCopy.description}
          className="min-h-[22rem]"
        />
      )}
    </div>
  );
}
