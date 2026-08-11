"use client";

import { useState, useTransition } from "react";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CircleDollarSign,
  Eye,
  Info,
  Play,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  PayrollEmployeeBreakdownDialog,
  type PayrollEmployeeBreakdownData,
} from "@/components/payroll/payroll-employee-breakdown-dialog";
import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { getMonthSelectItems, getYearSelectItems } from "@/components/payroll/select-utils";
import {
  fetchPayrollDetailAction,
  fetchPayrollRunsAction,
  generatePayrollRunAction,
  previewPayrollRunAction,
} from "@/lib/payroll/actions";
import {
  formatCurrency,
  formatPayrollMonth,
} from "@/lib/payroll/services/payroll-utils";
import type { PayrollBreakdown, PayrollDetail } from "@/types/payroll";

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

const PIPELINE_STEPS = [
  { icon: Users, label: "Active employees" },
  { icon: Wallet, label: "Salary structures" },
  { icon: ClipboardList, label: "Attendance & leave" },
  { icon: Banknote, label: "Bonuses & reimbursements" },
] as const;

type PayrollRunFormProps = {
  defaultYear: number;
  canRun: boolean;
};

type PanelState =
  | { kind: "idle" }
  | { kind: "info"; title: string; text: string; tone?: "default" | "warning" }
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
  defaultYear,
  canRun,
}: PayrollRunFormProps) {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(defaultYear));
  const [panel, setPanel] = useState<PanelState>({ kind: "idle" });
  const [breakdownEmployee, setBreakdownEmployee] =
    useState<PayrollEmployeeBreakdownData | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
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

  function handleRunPayroll() {
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

    startTransition(async () => {
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

  function openBreakdown(row: EmployeeTableRow) {
    setBreakdownEmployee({
      employeeId: row.id,
      employeeCode: row.code,
      employeeName: row.name,
      departmentName: row.department,
      basicSalary: row.basicSalary,
      totalAllowances: row.totalAllowances,
      totalDeductions: row.deductions,
      grossSalary: row.gross,
      netSalary: row.net,
      breakdown: row.breakdown,
      hasSalaryStructure: row.hasSalaryStructure,
      periodLabel,
    });
    setBreakdownOpen(true);
  }

  function mapRunItemToRow(item: PayrollDetail["items"][number]): EmployeeTableRow {
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
    };
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold tracking-tight">Run payroll</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Calculate monthly payroll from salary structures, attendance, leave, bonuses, and
              reimbursements.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.label}
                className="flex items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-xs"
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="font-medium text-foreground">{step.label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          </div>
          <Button
            onClick={handleRunPayroll}
            disabled={isPending || !canRun}
            className={`${filterControlClass} shrink-0 gap-1.5`}
          >
            <Play className="size-4" />
            Run payroll
          </Button>
        </div>

        {!canRun ? (
          <p className="mt-4 text-sm text-muted-foreground">
            You do not have permission to run payroll for this organization.
          </p>
        ) : null}
      </div>

      {panel.kind === "idle" ? (
        <PayrollRunStatusMessage
          icon={isFuturePeriod ? CalendarClock : CircleDollarSign}
          title={isFuturePeriod ? `${periodLabel} is an upcoming period` : "Run monthly payroll"}
          text={
            isFuturePeriod
              ? "Payroll can only be run for the current month and completed past months. Choose a completed month above."
              : "Select a month and year above, then click Run payroll to review an existing run or generate salaries for that period."
          }
          tone={isFuturePeriod ? "warning" : "default"}
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
            onView={openBreakdown}
          />
        </div>
      ) : null}

      <PayrollEmployeeBreakdownDialog
        employee={breakdownEmployee}
        open={breakdownOpen}
        onOpenChange={setBreakdownOpen}
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
  onView,
}: {
  rows: EmployeeTableRow[];
  onView: (row: EmployeeTableRow) => void;
}) {
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
          {rows.map((row) => (
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
