"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  CalendarClock,
  CircleDollarSign,
  Eye,
  Info,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { TeamPayrollDataSkeleton } from "@/components/payroll/team-payroll-content-skeleton";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PayrollEmployeeBreakdownDialog,
  type PayrollEmployeeBreakdownData,
} from "@/components/payroll/payroll-employee-breakdown-dialog";
import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge";
import { PayrollEditDialog } from "@/components/payroll/payroll-run-item-dialogs";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { getMonthSelectItems, getYearSelectItems } from "@/components/payroll/select-utils";
import { directoryDepartmentLabel } from "@/lib/employee/directory-listing";
import { fetchPayrollDetailAction } from "@/lib/payroll/actions";
import { toUserFriendlyError } from "@/lib/errors/user-messages";
import { resolvePayrollApplicablePeriod } from "@/lib/payroll/payroll-period";
import {
  formatCurrency,
  formatPayrollMonth,
  mapPayrollDisplayAmounts,
  roundCurrency,
  sumDisplayedPayrollRowTotals,
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
  email?: string | null;
  department: string | null;
  designationTitle?: string | null;
  employmentTypeName?: string | null;
  workingDays: number;
  presentDays: number;
  paidDays: number;
  holidayDays: number;
  clDays: number;
  elDays: number;
  monthlySalary: number;
  attendanceEarnings: number;
  deductions: number;
  net: number;
  bonus: number;
  incentive: number;
  reimbursement: number;
  finalPayable: number;
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
  initialPanel: CompanyPayrollInitialPanel;
  basePath: string;
};

type PanelState =
  | { kind: "info"; title: string; text: string; tone?: "default" | "warning" }
  | { kind: "preview"; data: PayrollPreviewResult }
  | { kind: "run"; data: PayrollDetail; mode: "existing" | "created" };

export type CompanyPayrollInitialPanel = Extract<
  PanelState,
  { kind: "run" } | { kind: "preview" } | { kind: "info" }
>;

function formatPayrollRunError(error: unknown): string {
  return toUserFriendlyError(
    error,
    "Something went wrong while loading payroll. Please try again.",
  );
}

function formatOptionalPayrollAmount(value: number): string {
  return value > 0 ? formatCurrency(value) : "—";
}

/** Open current-month banner. Closed and future months have no as-of cutoff. */
function resolveOpenPayrollAsOfLabel(month: number, year: number): string | null {
  const period = resolvePayrollApplicablePeriod(month, year);
  if (period.kind !== "current" || period.isClosed) return null;
  const [yearPart, monthPart, dayPart] = period.periodEnd.split("-").map(Number);
  const label = new Date(Date.UTC(yearPart, monthPart - 1, dayPart)).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" },
  );
  return `As of ${label}`;
}

function attendanceFactsFromBreakdown(breakdown: PayrollBreakdown) {
  const attendance = breakdown.attendance;
  return {
    presentDays: attendance.presentDays,
    paidDays: attendance.paidDays ?? attendance.presentDays,
    holidayDays: attendance.holidayCount ?? 0,
    clDays: attendance.clDays ?? 0,
    elDays: attendance.elDays ?? 0,
    lopDays: attendance.lopDays,
  };
}

function formatPayrollDayCount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}


function deriveBreakdownTotals(breakdown: PayrollBreakdown, attendanceEarnings: number) {
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
        : roundCurrency(attendanceEarnings - bonusTotal - claimsTotal),
  };
}

function tableRowToBreakdown(
  row: EmployeeTableRow,
  periodLabel: string,
): PayrollEmployeeBreakdownData {
  const totals = deriveBreakdownTotals(row.breakdown, row.attendanceEarnings);

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
    grossSalary: row.attendanceEarnings,
    netSalary: row.net,
    bonusTotal: totals.bonusTotal,
    claimsTotal: totals.claimsTotal,
    salaryTotal: totals.salaryTotal,
    breakdown: row.breakdown,
    hasSalaryStructure: row.hasSalaryStructure ?? (row.attendanceEarnings > 0 || row.net > 0),
    periodLabel,
  };
}

export function PayrollRunForm({
  defaultMonth,
  defaultYear,
  canRun,
  initialPanel,
  basePath,
}: PayrollRunFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [month, setMonth] = useState(String(defaultMonth ?? new Date().getMonth() + 1));
  const [year, setYear] = useState(String(defaultYear));
  const [panelOverride, setPanelOverride] = useState<PanelState | null>(null);
  const [breakdownEmployee, setBreakdownEmployee] =
    useState<PayrollEmployeeBreakdownData | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeTableRow | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const loadSeq = useRef(0);
  const panel = panelOverride ?? initialPanel;

  useEffect(() => {
    setMonth(String(defaultMonth ?? new Date().getMonth() + 1));
    setYear(String(defaultYear));
    setPanelOverride(null);
    setDepartmentFilter("");
    setEmployeeFilter("");
  }, [defaultMonth, defaultYear, initialPanel]);

  const hasPeriod = month.length > 0 && year.length > 0;
  const monthNumber = hasPeriod ? Number(month) : 0;
  const yearNumber = hasPeriod ? Number(year) : 0;
  const periodLabel = hasPeriod ? formatPayrollMonth(monthNumber, yearNumber) : "";
  const openMonthAsOfLabel = hasPeriod
    ? resolveOpenPayrollAsOfLabel(monthNumber, yearNumber)
    : null;

  function updatePeriod(nextMonth: string, nextYear: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", nextMonth);
    params.set("year", nextYear);
    startTransition(() => router.push(`${basePath}?${params.toString()}`));
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
        setPanelOverride({
          kind: "info",
          title: "Unable to load payroll",
          text: `Payroll for ${label} could not be loaded. Select the period again to refresh.`,
        });
        return;
      }
      setPanelOverride({ kind: "run", data: detail, mode });
    } catch (error) {
      if (seq !== loadSeq.current) return;
      setPanelOverride({
        kind: "info",
        title: "Unable to load payroll details",
        text: formatPayrollRunError(error),
      });
    }
  }

  function mapPayrollAmounts(
    breakdown: PayrollBreakdown,
    grossSalary: number,
    netSalary: number,
    totalAllowances: number,
    basicSalary: number,
    totalDeductions: number,
  ) {
    return mapPayrollDisplayAmounts({
      basicSalary,
      grossSalary,
      netSalary,
      totalDeductions,
      totalAllowances,
      breakdown,
    });
  }

  function openBreakdown(row: EmployeeTableRow) {
    if (!hasPeriod) return;
    setBreakdownEmployee(tableRowToBreakdown(row, periodLabel));
    setBreakdownOpen(true);
  }

  function mapPreviewItemToRow(item: PayrollPreviewResult["items"][number]): EmployeeTableRow {
    const amounts = mapPayrollAmounts(
      item.breakdown,
      item.grossSalary,
      item.netSalary,
      item.totalAllowances,
      item.basicSalary,
      item.totalDeductions,
    );
    const attendance = attendanceFactsFromBreakdown(item.breakdown);
    return {
      id: item.employeeId,
      name: item.employeeName,
      code: item.employeeCode,
      department: item.departmentName,
      designationTitle: item.designationTitle,
      employmentTypeName: item.employmentTypeName,
      workingDays: item.breakdown.attendance.workingDays,
      presentDays: attendance.presentDays,
      paidDays: attendance.paidDays,
      holidayDays: attendance.holidayDays,
      clDays: attendance.clDays,
      elDays: attendance.elDays,
      monthlySalary: amounts.monthlySalary,
      attendanceEarnings: amounts.attendanceEarnings,
      deductions: amounts.deductions,
      net: amounts.netSalary,
      bonus: amounts.bonus,
      incentive: amounts.incentive,
      reimbursement: amounts.reimbursement,
      finalPayable: amounts.finalPayable,
      lopDays: attendance.lopDays,
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
    const amounts = mapPayrollAmounts(
      item.breakdown,
      item.grossSalary,
      item.netSalary,
      item.totalAllowances,
      item.basicSalary,
      item.totalDeductions,
    );
    const attendance = attendanceFactsFromBreakdown(item.breakdown);
    return {
      id: item.employeeId,
      payrollItemId: item.id,
      name: item.employeeName,
      code: item.employeeCode,
      email: item.employeeEmail ?? null,
      department: item.departmentName,
      designationTitle: item.designationTitle,
      employmentTypeName: item.employmentTypeName,
      workingDays: item.breakdown.attendance.workingDays,
      presentDays: attendance.presentDays,
      paidDays: attendance.paidDays,
      holidayDays: attendance.holidayDays,
      clDays: attendance.clDays,
      elDays: attendance.elDays,
      monthlySalary: amounts.monthlySalary,
      attendanceEarnings: amounts.attendanceEarnings,
      deductions: amounts.deductions,
      net: amounts.netSalary,
      bonus: amounts.bonus,
      incentive: amounts.incentive,
      reimbursement: amounts.reimbursement,
      finalPayable: amounts.finalPayable,
      lopDays: attendance.lopDays,
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

  const tableRows = useMemo(() => {
    if (panel.kind === "preview") {
      return (panel.data.items ?? []).map(mapPreviewItemToRow);
    }
    if (panel.kind === "run") {
      return (panel.data.items ?? []).map(mapRunItemToRow);
    }
    return [];
  }, [panel]);

  const payrollSummary = useMemo(
    () =>
      sumDisplayedPayrollRowTotals(
        tableRows.map((row) => ({
          grossEarnings: row.attendanceEarnings,
          deductions: row.deductions,
          finalPayable: row.finalPayable,
        })),
      ),
    [tableRows],
  );

  const editDialogTarget = useMemo(() => {
    if (!editTarget?.payrollItemId) return null;
    return {
      payrollItemId: editTarget.payrollItemId,
      employeeName: editTarget.name,
      employeeCode: editTarget.code,
      currentBonus: editTarget.bonus,
      currentIncentive: editTarget.incentive,
      currentReimbursement: editTarget.reimbursement,
      netPay: editTarget.net,
      periodLabel,
      payslipSent: editTarget.payslipSent,
      adjustments: editTarget.adjustments,
    };
  }, [editTarget, periodLabel]);

  const departmentItems = useMemo(() => {
    const names = new Set<string>();
    for (const row of tableRows) {
      const label = directoryDepartmentLabel(row.department) ?? row.department;
      if (label?.trim()) names.add(label.trim());
    }
    return [
      { value: "", label: "All departments" },
      ...[...names].sort((a, b) => a.localeCompare(b)).map((name) => ({
        value: name,
        label: name,
      })),
    ];
  }, [tableRows]);

  const employeeItems = useMemo(() => {
    const department = departmentFilter.trim();
    const options = new Map<string, string>();
    for (const row of tableRows) {
      const departmentLabel =
        directoryDepartmentLabel(row.department) ?? row.department ?? "";
      if (department && departmentLabel !== department) continue;
      const label = row.code.trim() ? `${row.name} (${row.code})` : row.name;
      options.set(row.id, label);
    }
    return [
      { value: "all", label: "All employees" },
      ...[...options.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [departmentFilter, tableRows]);

  useEffect(() => {
    if (!employeeFilter) return;
    if (!employeeItems.some((item) => item.value === employeeFilter)) {
      setEmployeeFilter("");
    }
  }, [employeeFilter, employeeItems]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/55 p-3 lg:flex-row lg:items-center">
        <LabeledSelect
          items={monthItems}
          value={month}
          placeholder="Month"
          triggerClassName="h-10 w-[9.5rem] shrink-0 border-border/80 bg-white font-semibold dark:bg-input"
          onValueChange={(value) => {
            if (!value) return;
            setMonth(value);
            updatePeriod(value, year);
          }}
        />
        <LabeledSelect
          items={yearItems}
          value={year}
          placeholder="Year"
          triggerClassName="h-10 w-[7.5rem] shrink-0 border-border/80 bg-white font-semibold dark:bg-input"
          onValueChange={(value) => {
            if (!value) return;
            setYear(value);
            updatePeriod(month, value);
          }}
        />
        <LabeledSelect
          items={departmentItems}
          value={departmentFilter}
          placeholder="All departments"
          triggerClassName="h-10 w-[13.5rem] shrink-0 border-border/80 bg-white font-semibold dark:bg-input"
          onValueChange={(value) => setDepartmentFilter(value ?? "")}
        />
        <LabeledSelect
          items={employeeItems}
          value={employeeFilter || "all"}
          placeholder="All employees"
          nowrapItems
          triggerClassName="h-10 w-[18rem] shrink-0 border-border/80 bg-white font-semibold dark:bg-input"
          contentClassName="w-max min-w-[18rem] max-w-[28rem]"
          onValueChange={(value) => setEmployeeFilter(!value || value === "all" ? "" : value)}
        />
        {tableRows.length > 0 ? (
          <span className="inline-flex h-10 shrink-0 items-center rounded-md border border-border/80 bg-white px-3 text-sm font-semibold dark:bg-input">
            {tableRows.length} employees
          </span>
        ) : null}
      </div>

      {isPending ? <TeamPayrollDataSkeleton /> : null}

      {!isPending && panel.kind === "info" ? (
        <PayrollRunStatusMessage
          icon={panel.tone === "warning" ? CalendarClock : Info}
          title={panel.title}
          text={panel.text}
          tone={panel.tone ?? "default"}
        />
      ) : null}

      {!isPending && panel.kind === "preview" ? (
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Payroll for {periodLabel}</h3>
              {openMonthAsOfLabel ? (
                <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
                  {openMonthAsOfLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {openMonthAsOfLabel
                ? "Open month: salary starts from the full month. Only LOP already recorded reduces it. Future dates are not marked absent."
                : "Amounts below are calculated from salary structure, attendance, and leave for this period."}
            </p>
          </div>

          <PayrollTotals
            employeeCount={payrollSummary.employeeCount}
            totalGross={payrollSummary.totalGross}
            totalDeductions={payrollSummary.totalDeductions}
            totalFinalPayable={payrollSummary.totalFinalPayable}
          />

          <EmployeePayrollTable
            rows={tableRows}
            employeeId={employeeFilter}
            departmentFilter={departmentFilter}
            onView={openBreakdown}
            canMutate={false}
          />
        </div>
      ) : null}

      {!isPending && panel.kind === "run" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">Payroll for {periodLabel}</h3>
                <PayrollStatusBadge status={panel.data.payrollStatus} />
                {openMonthAsOfLabel ? (
                  <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
                    {openMonthAsOfLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {openMonthAsOfLabel
                  ? "Open month: salary starts from the full month. Only LOP already recorded reduces it. Future dates are not marked absent."
                  : "Amounts are calculated from salary structure, attendance, and leave for this period."}
              </p>
            </div>
          </div>

          <PayrollTotals
            employeeCount={payrollSummary.employeeCount}
            totalGross={payrollSummary.totalGross}
            totalDeductions={payrollSummary.totalDeductions}
            totalFinalPayable={payrollSummary.totalFinalPayable}
          />

          <EmployeePayrollTable
            rows={tableRows}
            employeeId={employeeFilter}
            departmentFilter={departmentFilter}
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
        target={editDialogTarget}
        open={Boolean(editTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditTarget(null);
        }}
        onSaved={(saved) => {
          if (panel.kind !== "run" || !editTarget?.payrollItemId) return;
          const payrollItemId = editTarget.payrollItemId;
          const payrollId = panel.data.id;
          const mode = panel.mode;
          setPanelOverride({
            kind: "run",
            mode,
            data: {
              ...panel.data,
              items: panel.data.items.map((item) => {
                if (item.id !== payrollItemId) return item;
                const previousReimb = editTarget.reimbursement ?? 0;
                const structuralAllowances = Math.max(0, item.totalAllowances - previousReimb);
                const nextAllowances = roundCurrency(structuralAllowances + saved.reimbursement);
                const earnings = (item.breakdown.earnings ?? []).filter((line) => {
                  const code = line.code.toLowerCase();
                  const label = (line.label ?? "").toLowerCase();
                  if (
                    code === "hr_bonus" ||
                    code === "hr_incentive" ||
                    code === "hr_reimbursement"
                  ) {
                    return false;
                  }
                  // Explicit HR reimbursement (including 0) replaces claim lines.
                  if (
                    code === "reimbursement" ||
                    code.startsWith("reimb") ||
                    label.includes("reimbursement")
                  ) {
                    return false;
                  }
                  return true;
                });
                if (saved.bonus > 0) {
                  earnings.push({
                    code: "hr_bonus",
                    label: "Bonus (HR adjustment)",
                    amount: saved.bonus,
                    type: "earning",
                  });
                }
                if (saved.incentive > 0) {
                  earnings.push({
                    code: "hr_incentive",
                    label: "Incentive",
                    amount: saved.incentive,
                    type: "earning",
                  });
                }
                if (saved.reimbursement > 0) {
                  earnings.push({
                    code: "hr_reimbursement",
                    label: "Reimbursement (HR adjustment)",
                    amount: saved.reimbursement,
                    type: "earning",
                  });
                }
                return {
                  ...item,
                  totalAllowances: nextAllowances,
                  breakdown: {
                    ...item.breakdown,
                    earnings,
                    excel: {
                      ...item.breakdown.excel,
                      reimbursement: saved.reimbursement,
                    },
                    hrAdjustments: {
                      ...item.breakdown.hrAdjustments,
                      bonus: saved.bonus,
                      incentive: saved.incentive,
                      reimbursements: saved.reimbursement,
                      itemStatus: "reviewed" as const,
                    },
                    payrollLifecycle: {
                      ...item.breakdown.payrollLifecycle,
                      itemStatus: "reviewed" as const,
                    },
                  },
                };
              }),
            },
          });
          setEditTarget(null);
          void fetchRunDetail(payrollId, mode, ++loadSeq.current, periodLabel);
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
  totalFinalPayable,
}: {
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalFinalPayable: number;
}) {
  return (
    <div className="grid w-full grid-cols-4 gap-3">
      <div className="rounded-lg border border-input bg-white px-3 py-2 dark:border-border dark:bg-card">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Employees
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">{employeeCount}</p>
      </div>
      <div className="rounded-lg border border-input bg-white px-3 py-2 dark:border-border dark:bg-card">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Gross Earning
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {formatCurrency(totalGross)}
        </p>
      </div>
      <div className="rounded-lg border border-input bg-white px-3 py-2 dark:border-border dark:bg-card">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Deductions
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {formatCurrency(totalDeductions)}
        </p>
      </div>
      <div className="rounded-lg border border-input bg-white px-3 py-2 dark:border-border dark:bg-card">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Final Payable
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {formatCurrency(totalFinalPayable)}
        </p>
      </div>
    </div>
  );
}

function EmployeePayrollTable({
  rows,
  employeeId = "",
  departmentFilter = "",
  onView,
  canMutate = false,
  onEdit,
}: {
  rows: EmployeeTableRow[];
  employeeId?: string;
  departmentFilter?: string;
  onView: (row: EmployeeTableRow) => void;
  canMutate?: boolean;
  onEdit?: (row: EmployeeTableRow) => void;
}) {
  const filteredRows = useMemo(() => {
    const selectedEmployeeId = employeeId.trim();
    const department = departmentFilter.trim();
    return rows.filter((row) => {
      const departmentLabel =
        directoryDepartmentLabel(row.department) ?? row.department ?? "";
      if (department && departmentLabel !== department) {
        return false;
      }
      if (selectedEmployeeId && row.id !== selectedEmployeeId) {
        return false;
      }
      return true;
    });
  }, [departmentFilter, employeeId, rows]);

  if (filteredRows.length === 0) {
    return (
      <div className="rounded-lg border border-input bg-white px-4 py-10 text-center text-sm text-muted-foreground dark:border-border dark:bg-card">
        {rows.length === 0
          ? "No employees in this payroll run."
          : "No employees match your filter."}
      </div>
    );
  }

  const headCell =
    "h-11 min-w-0 bg-transparent px-2 py-2 align-middle text-[11px] font-semibold uppercase leading-tight tracking-wide text-white";
  const moneyCell =
    "min-w-0 whitespace-nowrap px-1.5 py-2.5 text-center align-middle text-[13px] tabular-nums";

  return (
    <div className="max-h-[min(32rem,calc(100dvh-18rem))] min-w-0 overflow-x-hidden overflow-y-auto rounded-lg border border-input bg-white dark:border-border dark:bg-card">
      <table className="w-full table-fixed bg-white text-sm dark:bg-transparent">
        <colgroup>
          <col className="w-[14%]" />
          <col className="w-[11%]" />
          <col className="w-[8%]" />
          <col className="w-[6%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[12%]" />
          <col className="w-[9%]" />
          <col className="w-[10%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead className="sticky top-0 z-30 bg-blue-600 bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]">
          <tr>
            <th className={cn(headCell, "text-left")}>Employee</th>
            <th className={cn(headCell, "text-left")}>Department</th>
            <th className={cn(headCell, "text-center")}>Present / Paid</th>
            <th className={cn(headCell, "text-center")}>LOP</th>
            <th className={cn(headCell, "text-center")}>Monthly Salary</th>
            <th className={cn(headCell, "text-center")}>Gross Earnings</th>
            <th className={cn(headCell, "text-center")}>PT / Deductions</th>
            <th className={cn(headCell, "text-center")}>Reimbursement</th>
            <th className={cn(headCell, "text-center")}>Final Payable</th>
            <th className={cn(headCell, "text-center")}>Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-transparent">
          {filteredRows.map((row) => (
            <tr
              key={row.payrollItemId ?? row.id}
              className="group cursor-pointer border-b border-input/70 bg-white last:border-b-0 hover:bg-zinc-50 dark:border-border/60 dark:bg-transparent dark:hover:bg-white/[0.04]"
              onClick={() => onView(row)}
            >
              <td className="min-w-0 px-2 py-2.5 text-left align-middle">
                <button
                  type="button"
                  className="block min-w-0 max-w-full text-left font-medium break-words"
                  onClick={() => onView(row)}
                >
                  {row.name}
                </button>
                <div className="break-all text-xs text-muted-foreground">{row.code}</div>
              </td>
              <td className="min-w-0 px-2 py-2.5 text-left align-middle">
                <div className="break-words">{row.department ?? "—"}</div>
              </td>
              <td
                className="px-1.5 py-2.5 text-center align-middle tabular-nums"
                title="Paid days include present, paid holidays, and approved CL/EL"
              >
                {formatPayrollDayCount(row.paidDays)}
              </td>
              <td className="px-1.5 py-2.5 text-center align-middle tabular-nums">
                {formatPayrollDayCount(row.lopDays)}
              </td>
              <td className={moneyCell}>{formatCurrency(row.monthlySalary)}</td>
              <td className={moneyCell}>{formatCurrency(row.attendanceEarnings)}</td>
              <td className={moneyCell}>{formatCurrency(row.deductions)}</td>
              <td className={moneyCell}>{formatOptionalPayrollAmount(row.reimbursement)}</td>
              <td className={cn(moneyCell, "font-medium")}>{formatCurrency(row.finalPayable)}</td>
              <td
                className="px-1 py-2.5 text-center align-middle"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="inline-flex items-center justify-center gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="View payroll"
                          onClick={() => onView(row)}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      }
                    />
                    <TooltipContent>View</TooltipContent>
                  </Tooltip>
                  {canMutate && row.payrollItemId ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Edit payroll"
                            onClick={() => onEdit?.(row)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        }
                      />
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
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
