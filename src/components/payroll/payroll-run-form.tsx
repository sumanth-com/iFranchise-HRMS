"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  CalendarClock,
  CircleDollarSign,
  Eye,
  Info,
  Pencil,
  Search,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { TeamPayrollDataSkeleton } from "@/components/payroll/team-payroll-content-skeleton";
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
import { directoryDepartmentLabel } from "@/lib/employee/directory-listing";
import { fetchPayrollDetailAction } from "@/lib/payroll/actions";
import { toUserFriendlyError } from "@/lib/errors/user-messages";
import {
  formatCurrency,
  formatPayrollMonth,
  mapPayrollDisplayAmounts,
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

function stickyCellClass(isHeader = false) {
  return cn(
    isHeader ? "bg-blue-600" : "bg-white dark:bg-input",
    "sticky z-20",
  );
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
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const loadSeq = useRef(0);
  const panel = panelOverride ?? initialPanel;

  useEffect(() => {
    setMonth(String(defaultMonth ?? new Date().getMonth() + 1));
    setYear(String(defaultYear));
    setPanelOverride(null);
    setDepartmentFilter("");
    setEmployeeSearch("");
  }, [defaultMonth, defaultYear, initialPanel]);

  const hasPeriod = month.length > 0 && year.length > 0;
  const monthNumber = hasPeriod ? Number(month) : 0;
  const yearNumber = hasPeriod ? Number(year) : 0;
  const periodLabel = hasPeriod ? formatPayrollMonth(monthNumber, yearNumber) : "";

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
    return {
      id: item.employeeId,
      name: item.employeeName,
      code: item.employeeCode,
      department: item.departmentName,
      designationTitle: item.designationTitle,
      employmentTypeName: item.employmentTypeName,
      workingDays: item.breakdown.attendance.workingDays,
      paidDays: item.breakdown.attendance.paidDays ?? item.breakdown.attendance.presentDays,
      monthlySalary: amounts.monthlySalary,
      attendanceEarnings: amounts.attendanceEarnings,
      deductions: amounts.deductions,
      net: amounts.netSalary,
      bonus: amounts.bonus,
      incentive: amounts.incentive,
      reimbursement: amounts.reimbursement,
      finalPayable: amounts.finalPayable,
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
    const amounts = mapPayrollAmounts(
      item.breakdown,
      item.grossSalary,
      item.netSalary,
      item.totalAllowances,
      item.basicSalary,
      item.totalDeductions,
    );
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
      monthlySalary: amounts.monthlySalary,
      attendanceEarnings: amounts.attendanceEarnings,
      deductions: amounts.deductions,
      net: amounts.netSalary,
      bonus: amounts.bonus,
      incentive: amounts.incentive,
      reimbursement: amounts.reimbursement,
      finalPayable: amounts.finalPayable,
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

  const tableRows = useMemo(() => {
    if (panel.kind === "preview") {
      return (panel.data.items ?? []).map(mapPreviewItemToRow);
    }
    if (panel.kind === "run") {
      return (panel.data.items ?? []).map(mapRunItemToRow);
    }
    return [];
  }, [panel]);

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
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={employeeSearch}
            onChange={(event) => setEmployeeSearch(event.target.value)}
            placeholder="Search by name, email, or code..."
            className="h-10 w-full border-border/80 bg-white pl-9 font-semibold dark:bg-input"
            aria-label="Search employee"
          />
        </div>
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
            <h3 className="text-sm font-semibold">Payroll for {periodLabel}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Amounts below are calculated from salary structure, attendance, and leave for this
              period.
            </p>
          </div>

          <PayrollTotals
            employeeCount={panel.data.items?.length ?? panel.data.employeeCount ?? 0}
            totalGross={panel.data.totalGross}
            totalDeductions={panel.data.totalDeductions}
            totalNet={panel.data.totalNet}
          />

          <EmployeePayrollTable
            rows={tableRows}
            employeeSearch={employeeSearch}
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
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Amounts are calculated from salary structure, attendance, and leave for this
                period.
              </p>
            </div>
          </div>

          <PayrollTotals
            employeeCount={panel.data.items?.length ?? 0}
            totalGross={panel.data.totalGross}
            totalDeductions={panel.data.totalDeductions}
            totalNet={panel.data.totalNet}
          />

          <EmployeePayrollTable
            rows={tableRows}
            employeeSearch={employeeSearch}
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
        target={
          editTarget?.payrollItemId
            ? {
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
              }
            : null
        }
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSaved={(saved) => {
          if (panel.kind === "run" && editTarget?.payrollItemId) {
            const payrollItemId = editTarget.payrollItemId;
            setPanelOverride({
              kind: "run",
              mode: panel.mode,
              data: {
                ...panel.data,
                items: panel.data.items.map((item) => {
                  if (item.id !== payrollItemId) return item;
                  const previousReimb = editTarget.reimbursement ?? 0;
                  const structuralAllowances = Math.max(0, item.totalAllowances - previousReimb);
                  return {
                    ...item,
                    totalAllowances: roundCurrency(structuralAllowances + saved.reimbursement),
                    breakdown: {
                      ...item.breakdown,
                      hrAdjustments: {
                        ...item.breakdown.hrAdjustments,
                        bonus: saved.bonus,
                        incentive: saved.incentive,
                        reimbursements: saved.reimbursement,
                        itemStatus: "reviewed" as const,
                      },
                    },
                  };
                }),
              },
            });
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
          Attendance earnings
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
          Net salary
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
  departmentFilter = "",
  onView,
  canMutate = false,
  onEdit,
}: {
  rows: EmployeeTableRow[];
  employeeSearch?: string;
  departmentFilter?: string;
  onView: (row: EmployeeTableRow) => void;
  canMutate?: boolean;
  onEdit?: (row: EmployeeTableRow) => void;
}) {
  const filteredRows = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    const department = departmentFilter.trim();
    return rows.filter((row) => {
      const departmentLabel =
        directoryDepartmentLabel(row.department) ?? row.department ?? "";
      if (department && departmentLabel !== department) {
        return false;
      }
      if (!term) return true;
      const haystack = `${row.name} ${row.code} ${departmentLabel}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [departmentFilter, employeeSearch, rows]);

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
      <table className="w-full min-w-[72rem] bg-white text-sm dark:bg-input">
        <thead className="sticky top-0 z-30 bg-blue-600 bg-gradient-to-r from-blue-600 to-violet-600 text-left text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]">
          <tr>
            <th className={cn("left-0 z-40 h-11 min-w-[16rem] whitespace-nowrap px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white", stickyCellClass(true))}>Employee</th>
            <th className={cn("left-[16rem] z-40 h-11 min-w-[10rem] whitespace-nowrap px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white", stickyCellClass(true))}>Department</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Present / Paid</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">LOP days</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Monthly salary</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Attendance earnings</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Deductions</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Net salary</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Bonus</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Incentive</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Reimb.</th>
            <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Final payable</th>
            <th className={cn(TABLE_HEADER_CELL_CLASS, "sticky right-0 z-40 bg-blue-600 text-right")}>Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-input">
          {filteredRows.map((row) => (
            <tr
              key={row.payrollItemId ?? row.id}
              className="group border-b border-input/70 bg-white last:border-b-0 hover:bg-zinc-50 dark:bg-input dark:hover:bg-input/80"
            >
              <td className={cn("left-0 min-w-[16rem] max-w-[22rem] border-r border-input/40 px-3 py-2.5 shadow-[1px_0_0_rgba(0,0,0,0.04)] group-hover:bg-zinc-50 dark:group-hover:bg-input/80", stickyCellClass())}>
                <div className="truncate whitespace-nowrap font-medium" title={row.name}>
                  {row.name}
                </div>
                <div className="truncate whitespace-nowrap text-xs text-muted-foreground" title={row.code}>
                  {row.code}
                </div>
              </td>
              <td className={cn("left-[16rem] min-w-[10rem] border-r border-input/40 px-3 py-2.5 shadow-[1px_0_0_rgba(0,0,0,0.04)] group-hover:bg-zinc-50 dark:group-hover:bg-input/80", stickyCellClass())}>{row.department ?? "—"}</td>
              <td className="px-3 py-2.5 tabular-nums">{row.paidDays}</td>
              <td className="px-3 py-2.5 tabular-nums">{row.lopDays}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatCurrency(row.monthlySalary)}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatCurrency(row.attendanceEarnings)}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatCurrency(row.deductions)}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatCurrency(row.net)}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatOptionalPayrollAmount(row.bonus)}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatOptionalPayrollAmount(row.incentive)}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatOptionalPayrollAmount(row.reimbursement)}</td>
              <td className="px-3 py-2.5 tabular-nums font-medium">{formatCurrency(row.finalPayable)}</td>
              <td className="sticky right-0 z-20 bg-white px-3 py-2.5 text-right shadow-[-1px_0_0_rgba(0,0,0,0.04)] group-hover:bg-zinc-50 dark:bg-input dark:group-hover:bg-input/80">
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
