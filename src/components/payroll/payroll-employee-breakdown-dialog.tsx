"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatCurrency,
  mapPayrollDisplayAmounts,
} from "@/lib/payroll/services/payroll-utils";
import type { EmployeePayrollRunBreakdown } from "@/types/payroll";
import type { PayrollBreakdown } from "@/types/payroll";

export type PayrollEmployeeBreakdownData = EmployeePayrollRunBreakdown;

type PayrollEmployeeBreakdownDialogProps = {
  employee: PayrollEmployeeBreakdownData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function isHrAdjustmentLine(code: string) {
  return code.startsWith("hr_");
}

function formatOptionalAmount(value: number): string {
  return value > 0 ? formatCurrency(value) : formatCurrency(0);
}

export function PayrollEmployeeBreakdownDialog({
  employee,
  open,
  onOpenChange,
}: PayrollEmployeeBreakdownDialogProps) {
  const attendance = employee?.breakdown.attendance;
  const earnings = employee?.breakdown.earnings ?? [];
  const deductions = (employee?.breakdown.deductions ?? []).filter(
    (line) => Number(line.amount) > 0,
  );
  const systemEarnings = earnings.filter((line) => !isHrAdjustmentLine(line.code));
  const systemDeductions = deductions.filter((line) => !isHrAdjustmentLine(line.code));

  const amounts = employee
    ? mapPayrollDisplayAmounts({
        basicSalary: employee.basicSalary,
        grossSalary: employee.grossSalary,
        netSalary: employee.netSalary,
        totalDeductions: employee.totalDeductions,
        totalAllowances: employee.totalAllowances,
        breakdown: employee.breakdown,
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(88vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
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
              : "Payroll breakdown"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {!employee || !amounts ? null : (
            <>
              {employee.hasSalaryStructure === false ? (
                <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
                  No salary structure configured
                </p>
              ) : null}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Employee information
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <StatTile label="Employee" value={employee.employeeName} />
                  <StatTile label="Employee ID" value={employee.employeeCode} />
                  <StatTile label="Department" value={employee.departmentName ?? "—"} />
                  <StatTile label="Designation" value={employee.designationTitle ?? "—"} />
                  <StatTile
                    label="Employment type"
                    value={employee.employmentTypeName ?? "—"}
                  />
                  <StatTile label="Payroll month" value={employee.periodLabel} />
                </div>
              </section>

              {attendance ? (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Attendance summary
                  </h3>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    <StatTile label="Working days" value={String(attendance.workingDays)} />
                    <StatTile label="Present" value={String(attendance.presentDays)} />
                    <StatTile
                      label="Paid leave"
                      value={String(attendance.paidLeaveDays ?? attendance.leaveDays ?? 0)}
                    />
                    <StatTile label="LOP days" value={String(attendance.lopDays)} />
                    <StatTile label="Holidays" value={String(attendance.holidayCount ?? 0)} />
                    <StatTile label="Weekly offs" value={String(attendance.weekOffDays ?? 0)} />
                  </div>
                </section>
              ) : null}

              <div className="space-y-4">
                <LineItemsSection title="Earnings" lines={systemEarnings} />
                <LineItemsSection title="Deductions" lines={systemDeductions} />
              </div>

              <section className="mt-auto rounded-lg border bg-muted/20 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-sm font-medium tabular-nums">
                  <span className="text-muted-foreground">Monthly Salary</span>
                  <span>{formatCurrency(amounts.monthlySalary)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground">Attendance Earnings</span>
                  <span>{formatCurrency(amounts.attendanceEarnings)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground">Deductions</span>
                  <span>{formatCurrency(amounts.deductions)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground">Net Salary</span>
                  <span>{formatCurrency(amounts.netSalary)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground">Bonus</span>
                  <span>{formatOptionalAmount(amounts.bonus)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground">Incentive</span>
                  <span>{formatOptionalAmount(amounts.incentive)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground">Reimbursement</span>
                  <span>{formatOptionalAmount(amounts.reimbursement)}</span>
                  <span className="text-muted-foreground">=</span>
                  <span className="font-semibold text-primary">Final Payable</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(amounts.finalPayable)}
                  </span>
                </div>
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
