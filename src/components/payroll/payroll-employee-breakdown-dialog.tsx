"use client";

import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, toEmployeeFacingEarnings } from "@/lib/payroll/services/payroll-utils";
import type { EmployeePayrollRunBreakdown } from "@/types/payroll";
import type { PayrollBreakdown } from "@/types/payroll";

export type PayrollEmployeeBreakdownData = EmployeePayrollRunBreakdown;

type PayrollEmployeeBreakdownDialogProps = {
  employee: PayrollEmployeeBreakdownData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/30 px-2.5 py-2">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function LineItemsSection({
  title,
  lines,
}: {
  title: string;
  lines: PayrollBreakdown["earnings"];
}) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <section className="min-w-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="mt-2 divide-y rounded-lg border bg-card">
        {lines.map((line) => (
          <li
            key={`${line.code}-${line.label}`}
            className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm"
          >
            <span className="min-w-0 truncate text-foreground">{line.label}</span>
            <span className="shrink-0 tabular-nums font-medium">
              {formatCurrency(line.amount)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PayrollEmployeeBreakdownDialog({
  employee,
  open,
  onOpenChange,
  loading = false,
}: PayrollEmployeeBreakdownDialogProps) {
  if (!open) {
    return null;
  }

  const attendance = employee?.breakdown.attendance;
  const earnings = employee
    ? toEmployeeFacingEarnings(employee.breakdown.earnings ?? [])
    : [];
  const deductions = (employee?.breakdown.deductions ?? []).filter(
    (line) => Number(line.amount) > 0,
  );
  const notes = employee?.breakdown.notes ?? [];
  const bonusTotal =
    employee?.bonusTotal ??
    earnings.find((line) => line.code === "bonus")?.amount ??
    0;
  const claimsTotal =
    employee?.claimsTotal ??
    earnings.find((line) => line.code === "claims")?.amount ??
    0;
  const salaryTotal =
    employee?.salaryTotal ??
    earnings.find((line) => line.code === "salary")?.amount ??
    0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(88vh,680px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-lg font-semibold">
            {employee?.employeeName ?? "Employee payroll"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {employee
              ? `${employee.employeeCode}${
                  employee.departmentName ? ` · ${employee.departmentName}` : ""
                }${employee.periodLabel ? ` · ${employee.periodLabel}` : ""}`
              : "Loading live salary, bonuses, and expense claims."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Fetching salary, bonuses, and expense claims…
            </div>
          ) : !employee ? (
            <p className="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
              Could not load this employee&apos;s live payroll details. Close and try again.
            </p>
          ) : (
            <>
              {employee.hasSalaryStructure === false ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-100">
                  No salary structure is configured for this employee in the selected period.
                </p>
              ) : null}

              <div className="grid grid-cols-5 gap-2">
                <StatTile label="Salary" value={formatCurrency(salaryTotal)} />
                <StatTile label="Bonus" value={formatCurrency(bonusTotal)} />
                <StatTile label="Claims" value={formatCurrency(claimsTotal)} />
                <StatTile label="Gross" value={formatCurrency(employee.grossSalary)} />
                <StatTile label="Net pay" value={formatCurrency(employee.netSalary)} />
              </div>

              {attendance ? (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Attendance
                  </h3>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    <StatTile label="Working days" value={String(attendance.workingDays)} />
                    <StatTile label="Present" value={String(attendance.presentDays)} />
                    <StatTile label="Absent" value={String(attendance.absentDays)} />
                    <StatTile label="LOP days" value={String(attendance.lopDays)} />
                    <StatTile
                      label="Overtime (hrs)"
                      value={String(attendance.overtimeHours)}
                    />
                  </div>
                </section>
              ) : null}

              <div className="space-y-4">
                <LineItemsSection title="Earnings" lines={earnings} />
                <LineItemsSection title="Deductions" lines={deductions} />
              </div>

              {notes.length > 0 ? (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                  </h3>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {notes.map((note, index) => (
                      <li key={index} className="rounded-lg border bg-muted/20 px-3 py-2">
                        {note}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
