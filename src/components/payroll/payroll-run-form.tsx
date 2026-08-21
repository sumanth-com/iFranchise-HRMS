"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Eye,
  Info,
  Play,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  PayrollEmployeeBreakdownDialog,
  type PayrollEmployeeBreakdownData,
} from "@/components/payroll/payroll-employee-breakdown-dialog";
import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { getMonthSelectItems, getYearSelectItems } from "@/components/payroll/select-utils";
import {
  fetchEmployeePayrollBreakdownAction,
  fetchPayrollDetailAction,
  fetchPayrollRunsAction,
  generatePayrollRunAction,
  previewPayrollRunAction,
} from "@/lib/payroll/actions";
import {
  formatCurrency,
  formatPayrollMonth,
} from "@/lib/payroll/services/payroll-utils";
import type { PayrollBreakdown, PayrollDetail, PayrollPreviewResult } from "@/types/payroll";

type EmployeeTableRow = {
  id: string;
  name: string;
  code: string;
  department: string | null;
  gross: number;
  deductions: number;
  net: number;
  lopDays: number;
  note?: string;
  breakdown: PayrollBreakdown;
  basicSalary: number;
  totalAllowances: number;
  hasSalaryStructure?: boolean;
};

const monthItems = getMonthSelectItems();
const yearItems = getYearSelectItems();

type PayrollRunFormProps = {
  defaultMonth?: number;
  defaultYear: number;
  autoLoad?: boolean;
  canRun: boolean;
};

type PanelState =
  | { kind: "idle" }
  | { kind: "info"; title: string; text: string; tone?: "default" | "warning" }
  | { kind: "preview"; data: PayrollPreviewResult }
  | { kind: "run"; data: PayrollDetail; mode: "existing" | "created" };

function formatPayrollRunError(error: unknown): string {
  if (error instanceof Error) {
    if (/network error|failed to fetch|load failed/i.test(error.message)) {
      return "Connection lost. Refresh the page and try again.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function isFuturePayrollPeriod(month: number, year: number) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year > currentYear) return true;
  if (year === currentYear && month > currentMonth) return true;
  return false;
}

export function PayrollRunForm({
  defaultMonth,
  defaultYear,
  autoLoad = false,
  canRun,
}: PayrollRunFormProps) {
  const [month, setMonth] = useState(String(defaultMonth ?? new Date().getMonth() + 1));
  const [year, setYear] = useState(String(defaultYear));
  const [panel, setPanel] = useState<PanelState>({ kind: "idle" });
  const [breakdownEmployee, setBreakdownEmployee] =
    useState<PayrollEmployeeBreakdownData | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const breakdownRequestId = useRef(0);
  const autoLoadStarted = useRef(false);
  const [isPending, startTransition] = useTransition();

  const hasPeriod = month.length > 0 && year.length > 0;
  const monthNumber = hasPeriod ? Number(month) : 0;
  const yearNumber = hasPeriod ? Number(year) : 0;
  const periodLabel = hasPeriod ? formatPayrollMonth(monthNumber, yearNumber) : "";
  const isFuturePeriod =
    hasPeriod && isFuturePayrollPeriod(monthNumber, yearNumber);

  const filterControlClass = "h-9 w-full sm:w-44";

  function runInput() {
    return {
      month: monthNumber,
      year: yearNumber,
    };
  }

  function resetToIdle() {
    setPanel({ kind: "idle" });
    setEmployeeSearch("");
  }

  async function fetchRunDetail(payrollId: string, mode: "existing" | "created") {
    try {
      const detail = await fetchPayrollDetailAction(payrollId);
      if (!detail) {
        setPanel({
          kind: "info",
          title: "Payroll run saved",
          text: `The payroll run for ${periodLabel} was created, but details could not be loaded. Select the period again to refresh.`,
        });
        return;
      }
      setPanel({ kind: "run", data: detail, mode });
    } catch (error) {
      setPanel({
        kind: "info",
        title: "Unable to load payroll details",
        text: formatPayrollRunError(error),
      });
    }
  }

  async function loadPeriodSnapshot() {
    if (!hasPeriod) {
      setPanel({
        kind: "info",
        title: "Select a payroll period",
        text: "Choose a month and year before running payroll.",
      });
      return;
    }

    if (isFuturePeriod) {
      setPanel({
        kind: "info",
        title: `${periodLabel} is an upcoming period`,
        text: "Payroll can only be run for the current month and completed past months.",
        tone: "warning",
      });
      return;
    }

    try {
      const runs = await fetchPayrollRunsAction({
        month: monthNumber,
        year: yearNumber,
        page: 1,
        pageSize: 1,
      });

      if (runs.data[0]) {
        await fetchRunDetail(runs.data[0].id, "existing");
        return;
      }

      const previewResult = await previewPayrollRunAction(runInput());
      if (!previewResult.success) {
        setPanel({
          kind: "info",
          title: "Unable to load payroll",
          text: previewResult.message,
        });
        return;
      }

      const data = previewResult.data;

      if (data.employeeCount === 0) {
        setPanel({
          kind: "info",
          title: `No employees for ${periodLabel}`,
          text: "Add active employees before running payroll for this period.",
        });
        return;
      }

      if (data.totalGross === 0 && data.totalNet === 0) {
        const missingStructures = data.items.filter((item) => !item.hasSalaryStructure).length;
        setPanel({
          kind: "info",
          title: `No payable amounts for ${periodLabel}`,
          text:
            missingStructures === data.employeeCount
              ? "Configure salary structures for employees, then run payroll again."
              : "Review attendance, leave, bonuses, and reimbursements, then try again.",
        });
        return;
      }

      setPanel({ kind: "preview", data });
    } catch (error) {
      setPanel({
        kind: "info",
        title: "Unable to load payroll",
        text: formatPayrollRunError(error),
      });
    }
  }

  useEffect(() => {
    if (!autoLoad || !canRun || autoLoadStarted.current) return;
    autoLoadStarted.current = true;
    startTransition(() => {
      void loadPeriodSnapshot();
    });
    // Load the due period once when arriving from HR Overview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, canRun]);

  function handleRunPayroll() {
    if (panel.kind === "preview") {
      startTransition(async () => {
        try {
          const result = await generatePayrollRunAction(runInput());
          if (!result.success) {
            setPanel({
              kind: "info",
              title: "Unable to run payroll",
              text: result.message,
            });
            return;
          }

          toast.success(`Payroll run created for ${periodLabel}`);
          await fetchRunDetail(result.data, "created");
        } catch (error) {
          setPanel({
            kind: "info",
            title: "Unable to run payroll",
            text: formatPayrollRunError(error),
          });
        }
      });
      return;
    }

    startTransition(async () => {
      if (!hasPeriod) {
        setPanel({
          kind: "info",
          title: "Select a payroll period",
          text: "Choose a month and year before running payroll.",
        });
        return;
      }

      if (isFuturePeriod) {
        setPanel({
          kind: "info",
          title: `${periodLabel} is an upcoming period`,
          text: "Payroll can only be run for the current month and completed past months.",
          tone: "warning",
        });
        return;
      }

      try {
        const runs = await fetchPayrollRunsAction({
          month: monthNumber,
          year: yearNumber,
          page: 1,
          pageSize: 1,
        });

        if (runs.data[0]) {
          await fetchRunDetail(runs.data[0].id, "existing");
          return;
        }

        const previewResult = await previewPayrollRunAction(runInput());
        if (!previewResult.success) {
          setPanel({
            kind: "info",
            title: "Unable to run payroll",
            text: previewResult.message,
          });
          return;
        }

        const data = previewResult.data;

        if (data.employeeCount === 0) {
          setPanel({
            kind: "info",
            title: `No employees for ${periodLabel}`,
            text: "Add active employees before running payroll for this period.",
          });
          return;
        }

        if (data.totalGross === 0 && data.totalNet === 0) {
          const missingStructures = data.items.filter((item) => !item.hasSalaryStructure).length;
          setPanel({
            kind: "info",
            title: `No payable amounts for ${periodLabel}`,
            text:
              missingStructures === data.employeeCount
                ? "Configure salary structures for employees, then run payroll again."
                : "Review attendance, leave, bonuses, and reimbursements, then try again.",
          });
          return;
        }

        const result = await generatePayrollRunAction(runInput());
        if (!result.success) {
          setPanel({
            kind: "info",
            title: "Unable to run payroll",
            text: result.message,
          });
          return;
        }

        toast.success(`Payroll run created for ${periodLabel}`);
        await fetchRunDetail(result.data, "created");
      } catch (error) {
        setPanel({
          kind: "info",
          title: "Unable to run payroll",
          text: formatPayrollRunError(error),
        });
      }
    });
  }

  async function openBreakdown(row: EmployeeTableRow) {
    if (!hasPeriod) return;
    const requestId = ++breakdownRequestId.current;
    setBreakdownOpen(true);
    setBreakdownLoading(true);
    setBreakdownEmployee({
      employeeId: row.id,
      employeeCode: row.code,
      employeeName: row.name,
      departmentName: row.department,
      basicSalary: 0,
      totalAllowances: 0,
      totalDeductions: 0,
      grossSalary: 0,
      netSalary: 0,
      bonusTotal: 0,
      claimsTotal: 0,
      salaryTotal: 0,
      breakdown: {
        earnings: [],
        deductions: [],
        attendance: {
          workingDays: 0,
          presentDays: 0,
          absentDays: 0,
          lopDays: 0,
          leaveLopDays: 0,
          overtimeHours: 0,
        },
      },
      hasSalaryStructure: true,
      periodLabel,
    });

    const result = await fetchEmployeePayrollBreakdownAction({
      employeeId: row.id,
      month: monthNumber,
      year: yearNumber,
    });
    if (requestId !== breakdownRequestId.current) return;
    setBreakdownLoading(false);
    if (!result.success) {
      toast.error(result.message);
      setBreakdownEmployee(null);
      return;
    }
    setBreakdownEmployee(result.data);
  }

  function mapPreviewItemToRow(item: PayrollPreviewResult["items"][number]): EmployeeTableRow {
    return {
      id: item.employeeId,
      name: item.employeeName,
      code: item.employeeCode,
      department: item.departmentName,
      gross: item.grossSalary,
      deductions: item.totalDeductions,
      net: item.netSalary,
      lopDays: item.breakdown.attendance.lopDays,
      breakdown: item.breakdown,
      basicSalary: item.basicSalary,
      totalAllowances: item.totalAllowances,
      hasSalaryStructure: item.hasSalaryStructure,
      note: item.hasSalaryStructure ? undefined : "No salary structure",
    };
  }

  function mapRunItemToRow(item: PayrollDetail["items"][number]): EmployeeTableRow {
    const missingPay = item.grossSalary === 0 && item.netSalary === 0;
    return {
      id: item.employeeId,
      name: item.employeeName,
      code: item.employeeCode,
      department: item.departmentName,
      gross: item.grossSalary,
      deductions: item.totalDeductions,
      net: item.netSalary,
      lopDays: item.breakdown.attendance.lopDays,
      breakdown: item.breakdown,
      basicSalary: item.basicSalary,
      totalAllowances: item.totalAllowances,
      note: missingPay ? "No salary structure" : undefined,
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <LabeledSelect
          items={monthItems}
          value={month}
          placeholder="Select month"
          triggerClassName={filterControlClass}
          onValueChange={(value) => {
            if (!value) return;
            setMonth(value);
            resetToIdle();
          }}
          disabled={isPending}
        />
        <LabeledSelect
          items={yearItems}
          value={year}
          placeholder="Select year"
          triggerClassName={filterControlClass}
          onValueChange={(value) => {
            if (!value) return;
            setYear(value);
            resetToIdle();
          }}
          disabled={isPending}
        />
        <div className="relative w-full min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={employeeSearch}
            onChange={(event) => setEmployeeSearch(event.target.value)}
            placeholder="Search employee..."
            className="h-9 pl-9"
            disabled={isPending}
            aria-label="Search employee"
          />
        </div>
        <Button
          onClick={handleRunPayroll}
          disabled={isPending || !canRun}
          className={`${filterControlClass} shrink-0 gap-1.5 sm:ml-auto`}
        >
          <Play className="size-4" />
          Run payroll
        </Button>
      </div>

      {!canRun ? (
        <p className="text-sm text-muted-foreground">
          You do not have permission to run payroll for this organization.
        </p>
      ) : null}

      {panel.kind === "idle" ? (
        <PayrollRunStatusMessage
          icon={isPending ? ClipboardList : isFuturePeriod ? CalendarClock : CircleDollarSign}
          title={
            isPending
              ? `Loading payroll for ${periodLabel}`
              : isFuturePeriod
                ? `${periodLabel} is an upcoming period`
                : "Run monthly payroll"
          }
          text={
            isPending
              ? "Fetching the due payroll run or calculated amounts for this period."
              : isFuturePeriod
                ? "Payroll can only be run for the current month and completed past months. Choose a completed month above."
                : "Select a month and year above, then click Run payroll to review an existing run or generate salaries for that period."
          }
          tone={isFuturePeriod && !isPending ? "warning" : "default"}
        />
      ) : null}

      {panel.kind === "info" ? (
        <PayrollRunStatusMessage
          icon={panel.tone === "warning" ? CalendarClock : Info}
          title={panel.title}
          text={panel.text}
          tone={panel.tone ?? "default"}
        />
      ) : null}

      {panel.kind === "preview" ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Payroll due for {periodLabel}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This period has not been processed yet. Review the calculated amounts below, then
              click Run payroll to save the run.
            </p>
          </div>

          <PayrollTotals
            employeeCount={panel.data.items.length}
            totalGross={panel.data.totalGross}
            totalDeductions={panel.data.totalDeductions}
            totalNet={panel.data.totalNet}
          />

          <EmployeePayrollTable
            rows={panel.data.items.map(mapPreviewItemToRow)}
            employeeSearch={employeeSearch}
            onView={openBreakdown}
          />
        </div>
      ) : null}

      {panel.kind === "run" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">Payroll for {periodLabel}</h3>
                <PayrollStatusBadge status={panel.data.payrollStatus} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {panel.mode === "created"
                  ? "Payroll run created successfully. Review the breakdown below."
                  : "This period already has a payroll run. Review the recorded breakdown below."}
              </p>
            </div>
            {panel.mode === "created" ? (
              <div className="flex items-center gap-2 rounded-lg border bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="size-4" />
                Run completed
              </div>
            ) : null}
          </div>

          <PayrollTotals
            employeeCount={panel.data.items.length}
            totalGross={panel.data.totalGross}
            totalDeductions={panel.data.totalDeductions}
            totalNet={panel.data.totalNet}
          />

          <EmployeePayrollTable
            rows={panel.data.items.map(mapRunItemToRow)}
            employeeSearch={employeeSearch}
            onView={openBreakdown}
          />
        </div>
      ) : null}

      <PayrollEmployeeBreakdownDialog
        employee={breakdownEmployee}
        open={breakdownOpen}
        onOpenChange={setBreakdownOpen}
        loading={breakdownLoading}
      />
    </div>
  );
}

function PayrollRunStatusMessage({
  icon: Icon,
  title,
  text,
  tone = "default",
}: {
  icon: typeof CircleDollarSign;
  title: string;
  text: string;
  tone?: "default" | "warning";
}) {
  const iconWrapClass =
    tone === "warning"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "bg-muted/70 text-muted-foreground";

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div
        className={`flex size-14 items-center justify-center rounded-full ${iconWrapClass}`}
      >
        <Icon className="size-7" strokeWidth={1.75} />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function PayrollTotals({
  employeeCount,
  totalGross,
  totalDeductions,
  totalNet,
}: {
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Employees
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">{employeeCount}</p>
      </div>
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Gross
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {formatCurrency(totalGross)}
        </p>
      </div>
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Deductions
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {formatCurrency(totalDeductions)}
        </p>
      </div>
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Net
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {formatCurrency(totalNet)}
        </p>
      </div>
    </div>
  );
}

function EmployeePayrollTable({
  rows,
  employeeSearch = "",
  onView,
}: {
  rows: EmployeeTableRow[];
  employeeSearch?: string;
  onView: (row: EmployeeTableRow) => void;
}) {
  const filteredRows = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const haystack = `${row.name} ${row.code} ${row.department ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [employeeSearch, rows]);

  if (filteredRows.length === 0) {
    return (
      <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
        {rows.length === 0
          ? "No employees in this payroll run."
          : "No employees match your filter."}
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[min(32rem,calc(100dvh-18rem))] rounded-lg border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 border-b bg-muted/90 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 font-medium">Employee</th>
            <th className="px-3 py-2.5 font-medium">Department</th>
            <th className="px-3 py-2.5 font-medium">Gross</th>
            <th className="px-3 py-2.5 font-medium">Deductions</th>
            <th className="px-3 py-2.5 font-medium">Net</th>
            <th className="px-3 py-2.5 font-medium">LOP</th>
            <th className="px-3 py-2.5 text-right font-medium">View</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => (
            <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
              <td className="px-3 py-2.5">
                <div className="font-medium">{row.name}</div>
                <div className="text-xs text-muted-foreground">
                  {row.code}
                  {row.note ? ` · ${row.note}` : ""}
                </div>
              </td>
              <td className="px-3 py-2.5">{row.department ?? "—"}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatCurrency(row.gross)}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatCurrency(row.deductions)}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatCurrency(row.net)}</td>
              <td className="px-3 py-2.5 tabular-nums">{row.lopDays}</td>
              <td className="px-3 py-2.5 text-right">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5"
                  onClick={() => onView(row)}
                >
                  <Eye className="size-3.5" />
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
