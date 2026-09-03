"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  CircleDollarSign,
  Eye,
  Info,
  Pencil,
  Search,
} from "lucide-react";

import { Button } from "@/components/common/button";
import {
  TABLE_HEADER_CELL_CLASS,
} from "@/components/common/table-header-classes";
import { cn } from "@/lib/utils";
import { Input } from "@/components/common/input";
import {
  PayrollEmployeeBreakdownDialog,
  type PayrollEmployeeBreakdownData,
} from "@/components/payroll/payroll-employee-breakdown-dialog";
import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge";
import { PayrollEditDialog } from "@/components/payroll/payroll-run-item-dialogs";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { getMonthSelectItems, getYearSelectItems } from "@/components/payroll/select-utils";
import {
  fetchPayrollDetailAction,
  fetchPayrollRunsAction,
  ensureCompanyPayrollRunAction,
  previewPayrollRunAction,
} from "@/lib/payroll/actions";
import {
  formatCurrency,
  formatPayrollMonth,
  roundCurrency,
} from "@/lib/payroll/services/payroll-utils";
import type {
  HrPayrollAdjustments,
  PayrollBreakdown,
  PayrollDetail,
  PayrollItemLifecycleStatus,
  PayrollPreviewResult,
} from "@/types/payroll";

type EmployeeTableRow = {
  id: string;
  payrollItemId?: string;
  name: string;
  code: string;
  department: string | null;
  designationTitle?: string | null;
  employmentTypeName?: string | null;
  workingDays: number;
  paidDays: number;
  gross: number;
  deductions: number;
  net: number;
  lopDays: number;
  note?: string;
  breakdown: PayrollBreakdown;
  basicSalary: number;
  totalAllowances: number;
  hasSalaryStructure?: boolean;
  itemStatus?: PayrollItemLifecycleStatus;
  payslipSent?: boolean;
  adjustments?: HrPayrollAdjustments;
};

const monthItems = getMonthSelectItems();
const yearItems = getYearSelectItems();

type PayrollRunFormProps = {
  defaultMonth?: number;
  defaultYear: number;
  canRun: boolean;
  initialPanel?: CompanyPayrollInitialPanel;
};

type PanelState =
  | { kind: "idle" }
  | { kind: "info"; title: string; text: string; tone?: "default" | "warning" }
  | { kind: "preview"; data: PayrollPreviewResult }
  | { kind: "run"; data: PayrollDetail; mode: "existing" | "created" };

export type CompanyPayrollInitialPanel = Extract<
  PanelState,
  { kind: "run" } | { kind: "preview" } | { kind: "info" }
>;

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

function deriveBreakdownTotals(breakdown: PayrollBreakdown, grossSalary: number) {
  let bonusTotal = 0;
  let claimsTotal = 0;
  let salaryTotal = 0;

  for (const line of breakdown.earnings ?? []) {
    const code = line.code.toLowerCase();
    const label = line.label.toLowerCase();
    const amount = Number(line.amount) || 0;
    if (code.startsWith("bonus") || label.includes("bonus")) {
      bonusTotal += amount;
      continue;
    }
    if (
      code.startsWith("reimb") ||
      code === "claims" ||
      label.includes("reimbursement") ||
      label.includes("claim")
    ) {
      claimsTotal += amount;
      continue;
    }
    salaryTotal += amount;
  }

  return {
    bonusTotal: roundCurrency(bonusTotal),
    claimsTotal: roundCurrency(claimsTotal),
    salaryTotal:
      salaryTotal > 0
        ? roundCurrency(salaryTotal)
        : roundCurrency(grossSalary - bonusTotal - claimsTotal),
  };
}

function tableRowToBreakdown(
  row: EmployeeTableRow,
  periodLabel: string,
): PayrollEmployeeBreakdownData {
  const totals = deriveBreakdownTotals(row.breakdown, row.gross);

  return {
    employeeId: row.id,
    employeeCode: row.code,
    employeeName: row.name,
    departmentName: row.department,
    designationTitle: row.designationTitle,
    employmentTypeName: row.employmentTypeName,
    basicSalary: row.basicSalary,
    totalAllowances: row.totalAllowances,
    totalDeductions: row.deductions,
    grossSalary: row.gross,
    netSalary: row.net,
    bonusTotal: totals.bonusTotal,
    claimsTotal: totals.claimsTotal,
    salaryTotal: totals.salaryTotal,
    breakdown: row.breakdown,
    hasSalaryStructure: row.hasSalaryStructure ?? (row.gross > 0 || row.net > 0),
    periodLabel,
  };
}

export function PayrollRunForm({
  defaultMonth,
  defaultYear,
  canRun,
  initialPanel,
}: PayrollRunFormProps) {
  const [month, setMonth] = useState(String(defaultMonth ?? new Date().getMonth() + 1));
  const [year, setYear] = useState(String(defaultYear));
  const [panel, setPanel] = useState<PanelState>(initialPanel ?? { kind: "idle" });
  const [breakdownEmployee, setBreakdownEmployee] =
    useState<PayrollEmployeeBreakdownData | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeTableRow | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const loadSeq = useRef(0);

  const hasPeriod = month.length > 0 && year.length > 0;
  const monthNumber = hasPeriod ? Number(month) : 0;
  const yearNumber = hasPeriod ? Number(year) : 0;
  const periodLabel = hasPeriod ? formatPayrollMonth(monthNumber, yearNumber) : "";
  const isFuturePeriod =
    hasPeriod && isFuturePayrollPeriod(monthNumber, yearNumber);
  const periodLoadKey = `${monthNumber}-${yearNumber}-${canRun}`;
  const initialPeriodKey = `${defaultMonth ?? new Date().getMonth() + 1}-${defaultYear}-${canRun}`;
  const skipInitialClientLoad = useRef(Boolean(initialPanel));

  function runInput() {
    return {
      month: monthNumber,
      year: yearNumber,
    };
  }

  async function fetchRunDetail(
    payrollId: string,
    mode: "existing" | "created",
    seq: number,
    label: string,
  ) {
    try {
      const detail = await fetchPayrollDetailAction(payrollId);
      if (seq !== loadSeq.current) return;
      if (!detail) {
        setPanel({
          kind: "info",
          title: "Unable to load payroll",
          text: `Payroll for ${label} could not be loaded. Select the period again to refresh.`,
        });
        return;
      }
      setPanel({ kind: "run", data: detail, mode });
    } catch (error) {
      if (seq !== loadSeq.current) return;
      setPanel({
        kind: "info",
        title: "Unable to load payroll details",
        text: formatPayrollRunError(error),
      });
    }
  }

  async function loadPeriodSnapshot() {
    const seq = ++loadSeq.current;
    if (!hasPeriod) {
      setPanel({
        kind: "info",
        title: "Select a payroll period",
        text: "Choose a month and year to view Company Payroll.",
      });
      return;
    }

    if (isFuturePeriod) {
      setPanel({
        kind: "info",
        title: `${periodLabel} is an upcoming period`,
        text: "Payroll is calculated for the current month and completed past months.",
        tone: "warning",
      });
      return;
    }

    try {
      if (canRun) {
        const generated = await ensureCompanyPayrollRunAction(runInput());
        if (seq !== loadSeq.current) return;
        if (generated.success) {
          await fetchRunDetail(generated.data, "existing", seq, periodLabel);
          return;
        }
      }

      const runs = await fetchPayrollRunsAction({
        month: monthNumber,
        year: yearNumber,
        page: 1,
        pageSize: 1,
      });
      if (seq !== loadSeq.current) return;

      if (runs.data[0]) {
        await fetchRunDetail(runs.data[0].id, "existing", seq, periodLabel);
        return;
      }

      const previewResult = await previewPayrollRunAction(runInput());
      if (seq !== loadSeq.current) return;
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
          text: "Add active employees before viewing payroll for this period.",
        });
        return;
      }

      setPanel({ kind: "preview", data });
    } catch (error) {
      if (seq !== loadSeq.current) return;
      setPanel({
        kind: "info",
        title: "Unable to load payroll",
        text: formatPayrollRunError(error),
      });
    }
  }

  useEffect(() => {
    if (!hasPeriod) return;
    if (skipInitialClientLoad.current && periodLoadKey === initialPeriodKey) {
      skipInitialClientLoad.current = false;
      return;
    }
    void loadPeriodSnapshot();
    // Recalculate when HR changes month or year.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodLoadKey]);

  function openBreakdown(row: EmployeeTableRow) {
    if (!hasPeriod) return;
    setBreakdownEmployee(tableRowToBreakdown(row, periodLabel));
    setBreakdownOpen(true);
  }

  function mapPreviewItemToRow(item: PayrollPreviewResult["items"][number]): EmployeeTableRow {
    return {
      id: item.employeeId,
      name: item.employeeName,
      code: item.employeeCode,
      department: item.departmentName,
      designationTitle: item.designationTitle,
      employmentTypeName: item.employmentTypeName,
      workingDays: item.breakdown.attendance.workingDays,
      paidDays: item.breakdown.attendance.paidDays ?? item.breakdown.attendance.presentDays,
      gross: item.grossSalary,
      deductions: item.totalDeductions,
      net: item.netSalary,
      lopDays: item.breakdown.attendance.lopDays,
      breakdown: item.breakdown,
      basicSalary: item.basicSalary,
      totalAllowances: item.totalAllowances,
      hasSalaryStructure: item.hasSalaryStructure,
      itemStatus: "draft",
      note: item.hasSalaryStructure ? undefined : "No salary structure configured",
    };
  }

  function mapRunItemToRow(item: PayrollDetail["items"][number]): EmployeeTableRow {
    const missingStructure = item.hasSalaryStructure === false;
    return {
      id: item.employeeId,
      payrollItemId: item.id,
      name: item.employeeName,
      code: item.employeeCode,
      department: item.departmentName,
      designationTitle: item.designationTitle,
      employmentTypeName: item.employmentTypeName,
      workingDays: item.breakdown.attendance.workingDays,
      paidDays: item.breakdown.attendance.paidDays ?? item.breakdown.attendance.presentDays,
      gross: item.grossSalary,
      deductions: item.totalDeductions,
      net: item.netSalary,
      lopDays: item.breakdown.attendance.lopDays,
      breakdown: item.breakdown,
      basicSalary: item.basicSalary,
      totalAllowances: item.totalAllowances,
      hasSalaryStructure: !missingStructure,
      itemStatus: item.itemStatus ?? "draft",
      payslipSent: item.payslipSent,
      adjustments: item.breakdown.hrAdjustments,
      note: missingStructure ? "No salary structure configured" : undefined,
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <LabeledSelect
          items={monthItems}
          value={month}
          placeholder="Select month"
          triggerClassName="h-9 w-[140px]"
          onValueChange={(value) => {
            if (!value) return;
            setMonth(value);
          }}
        />
        <LabeledSelect
          items={yearItems}
          value={year}
          placeholder="Select year"
          triggerClassName="h-9 w-[100px]"
          onValueChange={(value) => {
            if (!value) return;
            setYear(value);
          }}
        />
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={employeeSearch}
            onChange={(event) => setEmployeeSearch(event.target.value)}
            placeholder="Search employee..."
            className="h-9 w-full pl-9"
            aria-label="Search employee"
          />
        </div>
      </div>

      {!canRun ? (
        <p className="text-sm text-muted-foreground">
          You do not have permission to view Company Payroll for this organization.
        </p>
      ) : null}

      {panel.kind === "idle" ? (
        <PayrollRunStatusMessage
          icon={isFuturePeriod ? CalendarClock : CircleDollarSign}
          title={
            isFuturePeriod ? `${periodLabel} is an upcoming period` : "Company Payroll"
          }
          text={
            isFuturePeriod
              ? "Payroll is calculated for the current month and completed past months. Choose a completed month above."
              : "Select a month and year above to view payroll for that period."
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

      {panel.kind === "preview" ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Payroll for {periodLabel}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Amounts below are calculated from salary structure, attendance, and leave for this
              period.
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
            canMutate={false}
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
                Amounts are calculated from salary structure, attendance, and leave for this
                period.
              </p>
            </div>
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
            canMutate={canRun && !panel.data.isLocked}
            onEdit={setEditTarget}
          />
        </div>
      ) : null}

      <PayrollEmployeeBreakdownDialog
        employee={breakdownEmployee}
        open={breakdownOpen}
        onOpenChange={setBreakdownOpen}
      />
      <PayrollEditDialog
        key={editTarget?.payrollItemId ?? "edit"}
        target={
          editTarget?.payrollItemId
            ? {
                payrollItemId: editTarget.payrollItemId,
                employeeName: editTarget.name,
                employeeCode: editTarget.code,
                netPay: editTarget.net,
                periodLabel,
                payslipSent: editTarget.payslipSent,
                adjustments: editTarget.adjustments,
                systemGross: editTarget.gross,
                systemLop: editTarget.lopDays,
                systemPf:
                  editTarget.breakdown.deductions.find((line) => line.code === "pf")?.amount ?? 0,
              }
            : null
        }
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSaved={() => {
          if (panel.kind === "run") {
            void fetchRunDetail(panel.data.id, panel.mode, ++loadSeq.current, periodLabel);
          }
        }}
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
    <div className="grid w-full grid-cols-4 gap-3">
      <div className="rounded-lg border border-input bg-white px-3 py-2 dark:bg-input">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Employees
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">{employeeCount}</p>
      </div>
      <div className="rounded-lg border border-input bg-white px-3 py-2 dark:bg-input">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Gross
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {formatCurrency(totalGross)}
        </p>
      </div>
      <div className="rounded-lg border border-input bg-white px-3 py-2 dark:bg-input">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Deductions
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {formatCurrency(totalDeductions)}
        </p>
      </div>
      <div className="rounded-lg border border-input bg-white px-3 py-2 dark:bg-input">
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
  canMutate = false,
  onEdit,
}: {
  rows: EmployeeTableRow[];
  employeeSearch?: string;
  onView: (row: EmployeeTableRow) => void;
  canMutate?: boolean;
  onEdit?: (row: EmployeeTableRow) => void;
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
      <div className="rounded-lg border border-input bg-white px-4 py-10 text-center text-sm text-muted-foreground dark:bg-input">
        {rows.length === 0
          ? "No employees in this payroll run."
          : "No employees match your filter."}
      </div>
    );
  }

  return (
    <div className="max-h-[min(32rem,calc(100dvh-18rem))] overflow-auto rounded-lg border border-input bg-white dark:bg-input">
      <table className="w-full bg-white text-sm dark:bg-input">
        <thead className="sticky top-0 z-30 bg-blue-600 bg-gradient-to-r from-blue-600 to-violet-600 text-left text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]">
          <tr>
            <th className="h-11 min-w-[16rem] whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Employee</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Department</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Working days</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Present / Paid</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">LOP days</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Gross</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Deductions</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Net pay</th>
            <th className={cn(TABLE_HEADER_CELL_CLASS, "text-right")}>Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-input">
          {filteredRows.map((row) => (
            <tr
              key={row.payrollItemId ?? row.id}
              className="border-b border-input/70 bg-white last:border-b-0 hover:bg-zinc-50 dark:bg-input dark:hover:bg-input/80"
            >
              <td className="min-w-[16rem] max-w-[22rem] px-3 py-2.5">
                <div className="truncate whitespace-nowrap font-medium" title={row.name}>
                  {row.name}
                </div>
                <div className="truncate whitespace-nowrap text-xs text-muted-foreground" title={row.code}>
                  {row.code}
                </div>
              </td>
              <td className="px-3 py-2.5">{row.department ?? "—"}</td>
              <td className="px-3 py-2.5 tabular-nums">{row.workingDays}</td>
              <td className="px-3 py-2.5 tabular-nums">{row.paidDays}</td>
              <td className="px-3 py-2.5 tabular-nums">{row.lopDays}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatCurrency(row.gross)}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatCurrency(row.deductions)}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatCurrency(row.net)}</td>
              <td className="px-3 py-2.5 text-right">
                <div className="flex justify-end gap-1.5">
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
                  {canMutate && row.payrollItemId ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 px-2.5"
                      onClick={() => onEdit?.(row)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
