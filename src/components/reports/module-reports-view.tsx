"use client";

import { Download, FileSpreadsheet, FileText, Loader2, Play, Printer } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { getMonthSelectItems, getYearSelectItems } from "@/components/payroll/select-utils";
import { canExportReports } from "@/lib/reports/constants";
import { exportReportAction, runReportAction } from "@/lib/reports/actions";
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

function defaultDateRange(days = 30) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
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
  leave: [
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "cancelled", label: "Cancelled" },
  ],
  payroll: [
    { value: "draft", label: "Draft" },
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Completed" },
    { value: "paid", label: "Paid" },
  ],
  performance: [
    { value: "draft", label: "Draft" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ],
  recruitment: [
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
    { value: "on_hold", label: "On Hold" },
    { value: "filled", label: "Filled" },
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

function showFiltersFor(key: ReportKey) {
  return {
    branch: key.startsWith("hr_") || key.startsWith("attendance_") || key.startsWith("assets_"),
    designation: key.startsWith("hr_") || key.startsWith("performance_"),
    employee:
      key.startsWith("attendance_") ||
      key.startsWith("leave_") ||
      key.startsWith("payroll_") ||
      key.startsWith("performance_") ||
      key.startsWith("assets_") ||
      key.startsWith("exit_"),
    monthYear:
      key.startsWith("attendance_") ||
      key.startsWith("payroll_") ||
      key === "leave_trends" ||
      key === "exit_attrition",
  };
}

const MONTH_ANY = "__any_month__";
const YEAR_ANY = "__any_year__";

function buildFilters(
  dateFrom: string,
  dateTo: string,
  departmentId: string,
  branchId: string,
  designationId: string,
  employeeId: string,
  status: string,
  month: string,
  year: string,
): ReportFilters {
  return {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    departmentId: departmentId && departmentId !== ALL_OPTION.value ? departmentId : undefined,
    branchId: branchId && branchId !== ALL_OPTION.value ? branchId : undefined,
    designationId:
      designationId && designationId !== ALL_OPTION.value ? designationId : undefined,
    employeeId: employeeId && employeeId !== ALL_OPTION.value ? employeeId : undefined,
    status: status && status !== ALL_OPTION.value ? status : undefined,
    month: month && month !== MONTH_ANY ? Number(month) : undefined,
    year: year && year !== YEAR_ANY ? Number(year) : undefined,
  };
}

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
  const fallbackDates = defaultDateRange(30);
  const [isPending, startTransition] = useTransition();
  const [reportKey, setReportKey] = useState<ReportKey>(
    initialReportKey ?? definitions[0]?.key ?? "hr_employee_master",
  );
  const [result, setResult] = useState<ReportResult | null>(initialResult);
  const [dateFrom, setDateFrom] = useState(
    defaultFilters?.dateFrom ?? fallbackDates.dateFrom,
  );
  const [dateTo, setDateTo] = useState(defaultFilters?.dateTo ?? fallbackDates.dateTo);
  const [departmentId, setDepartmentId] = useState(
    defaultFilters?.departmentId ?? ALL_OPTION.value,
  );
  const [branchId, setBranchId] = useState(defaultFilters?.branchId ?? ALL_OPTION.value);
  const [designationId, setDesignationId] = useState(
    defaultFilters?.designationId ?? ALL_OPTION.value,
  );
  const [employeeId, setEmployeeId] = useState(
    defaultFilters?.employeeId ?? ALL_OPTION.value,
  );
  const [status, setStatus] = useState(defaultFilters?.status ?? ALL_OPTION.value);
  const [month, setMonth] = useState(
    defaultFilters?.month ? String(defaultFilters.month) : MONTH_ANY,
  );
  const [year, setYear] = useState(
    defaultFilters?.year ? String(defaultFilters.year) : String(new Date().getFullYear()),
  );

  const selectedDef = definitions.find((d) => d.key === reportKey) ?? definitions[0];
  const filterVisibility = showFiltersFor(reportKey);
  const statusOptions = MODULE_STATUS_OPTIONS[module] ?? [];

  const departmentItems = useMemo(
    () => [
      ALL_OPTION,
      ...lookups.departments.map((d) => ({ value: d.id, label: d.label })),
    ],
    [lookups.departments],
  );
  const branchItems = useMemo(
    () => [ALL_OPTION, ...lookups.branches.map((b) => ({ value: b.id, label: b.label }))],
    [lookups.branches],
  );
  const designationItems = useMemo(
    () => [
      ALL_OPTION,
      ...lookups.designations.map((d) => ({ value: d.id, label: d.label })),
    ],
    [lookups.designations],
  );
  const employeeItems = useMemo(
    () => [
      ALL_OPTION,
      ...lookups.employees.map((e) => ({ value: e.id, label: e.label })),
    ],
    [lookups.employees],
  );
  const reportItems = useMemo(
    () => definitions.map((d) => ({ value: d.key, label: d.title })),
    [definitions],
  );
  const statusItems = useMemo(
    () => [ALL_OPTION, ...statusOptions],
    [statusOptions],
  );
  const monthItems = useMemo(
    () => [{ value: MONTH_ANY, label: "Any month" }, ...getMonthSelectItems()],
    [],
  );
  const yearItems = useMemo(() => {
    const current = new Date().getFullYear();
    return [
      { value: YEAR_ANY, label: "Any year" },
      ...getYearSelectItems([current - 1, current, current + 1]),
    ];
  }, []);

  const columns = useMemo<DataTableColumn<Record<string, unknown>>[]>(() => {
    if (!result) return [];
    return result.columns.map((col) => ({
      key: col.key,
      header: col.header,
      render: (row) => {
        const value = row[col.key];
        if (value == null || value === "") return "—";
        return String(value);
      },
    }));
  }, [result]);

  const tableRows = useMemo(() => {
    if (!result) return [];
    return result.rows.map((row) => ({ ...row })) as Record<string, unknown>[];
  }, [result]);

  function currentFilters() {
    return buildFilters(
      dateFrom,
      dateTo,
      departmentId,
      branchId,
      designationId,
      employeeId,
      status,
      month,
      year,
    );
  }

  function onRun() {
    startTransition(async () => {
      const res = await runReportAction(reportKey, currentFilters());
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setResult(res.data);
      toast.success(`Loaded ${res.data.total} row${res.data.total === 1 ? "" : "s"}`);
    });
  }

  function onExport(format: ReportExportFormat) {
    startTransition(async () => {
      const res = await exportReportAction(reportKey, currentFilters(), format);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      downloadBase64(res.filename, res.mimeType, res.contentBase64);
      toast.success(`Exported ${res.rowCount} row${res.rowCount === 1 ? "" : "s"}`);
    });
  }

  function onPrint() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{MODULE_TITLES[module]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedDef?.description ?? "Run filtered operational reports and export results."}
        </p>
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Report type</Label>
            <LabeledSelect
              items={reportItems}
              value={reportKey}
              onValueChange={(value) => {
                setReportKey(value as ReportKey);
                setResult(null);
              }}
              placeholder="Select report"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateFrom">From</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateTo">To</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <LabeledSelect
              items={departmentItems}
              value={departmentId}
              onValueChange={setDepartmentId}
              placeholder="All departments"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <LabeledSelect
              items={statusItems}
              value={status}
              onValueChange={setStatus}
              placeholder="All statuses"
            />
          </div>
          {filterVisibility.branch ? (
            <div className="space-y-2">
              <Label>Branch</Label>
              <LabeledSelect
                items={branchItems}
                value={branchId}
                onValueChange={setBranchId}
                placeholder="All branches"
              />
            </div>
          ) : null}
          {filterVisibility.designation ? (
            <div className="space-y-2">
              <Label>Designation</Label>
              <LabeledSelect
                items={designationItems}
                value={designationId}
                onValueChange={setDesignationId}
                placeholder="All designations"
              />
            </div>
          ) : null}
          {filterVisibility.employee ? (
            <div className="space-y-2">
              <Label>Employee</Label>
              <LabeledSelect
                items={employeeItems}
                value={employeeId}
                onValueChange={setEmployeeId}
                placeholder="All employees"
              />
            </div>
          ) : null}
          {filterVisibility.monthYear ? (
            <>
              <div className="space-y-2">
                <Label>Month</Label>
                <LabeledSelect
                  items={monthItems}
                  value={month}
                  onValueChange={setMonth}
                  placeholder="Any month"
                />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <LabeledSelect
                  items={yearItems}
                  value={year}
                  onValueChange={setYear}
                  placeholder="Any year"
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onRun} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run Report
          </Button>
          {canExport ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onExport("csv")}
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onExport("excel")}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onExport("pdf")}
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={!result || isPending}
            onClick={onPrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </section>

      <div id="report-print-region" className="space-y-3">
        {result ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-medium">{result.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {result.total} row{result.total === 1 ? "" : "s"} · Generated{" "}
                  {new Date(result.generatedAt).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            <DataTable
              columns={columns}
              data={tableRows}
              emptyMessage="Report returned no rows for the selected filters."
            />
          </>
        ) : (
          <EmptyState
            title="No report loaded"
            description="Choose a report type, adjust filters, and click Run Report."
          />
        )}
      </div>
    </div>
  );
}
