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
  emptyLabel,
}: {
  title: string;
  lines: PayrollBreakdown["earnings"];
  emptyLabel: string;
}) {
  return (
    <section className="min-w-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {lines.length === 0 ? (
        <p className="mt-2 rounded-lg border bg-card px-3 py-2.5 text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-2 divide-y rounded-lg border bg-card">
          {lines.map((line) => (
            <li
              key={`${line.code}-${line.label}`}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-foreground">{line.label}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatCurrency(line.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function isHrAdjustmentLine(code: string) {
  return code.startsWith("hr_");
}

function isLopDeductionLine(line: { code: string; label: string }) {
  const code = line.code.toLowerCase();
  const label = line.label.toLowerCase();
  return code === "lop" || label.includes("loss of pay") || label.includes("(lop)");
}

function PayrollNetLine({
  monthlySalary,
  attendanceEarnings,
  deductions,
  netSalary,
  lopAmount,
}: {
  monthlySalary: number;
  attendanceEarnings: number;
  deductions: number;
  netSalary: number;
  lopAmount: number;
}) {
  const includeLop =
    lopAmount > 0 &&
    Math.abs(Math.round(monthlySalary - lopAmount - deductions) - Math.round(netSalary)) <= 1;
  const startAmount = includeLop ? monthlySalary : attendanceEarnings;

  return (
    <p className="flex items-baseline justify-center gap-x-1.5 whitespace-nowrap text-sm tabular-nums">
      <span className="text-muted-foreground">Gross Earning</span>
      <span className="font-medium">{formatCurrency(startAmount)}</span>
      {includeLop ? (
        <>
          <span className="text-muted-foreground">−</span>
          <span className="text-muted-foreground">LOP</span>
          <span className="font-medium">{formatCurrency(lopAmount)}</span>
        </>
      ) : null}
      <span className="text-muted-foreground">−</span>
      <span className="text-muted-foreground">Deductions</span>
      <span className="font-medium">{formatCurrency(deductions)}</span>
      <span className="text-muted-foreground">=</span>
      <span className="font-semibold text-primary">Net salary</span>
      <span className="font-semibold text-primary">{formatCurrency(netSalary)}</span>
    </p>
  );
}

function formatLeaveUsageDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatLeaveDayCount(days: number): string {
  const rounded = Math.round((Number(days) || 0) * 100) / 100;
  const label = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${label} ${rounded === 1 ? "day" : "days"}`;
}

function LeaveUsageBlock({
  title,
  days,
  dates,
  emptyLabel,
}: {
  title: string;
  days: number;
  dates: string[];
  emptyLabel: string;
}) {
  const used = Number(days) || 0;
  const sortedDates = [...dates].filter(Boolean).sort();

  return (
    <div className="min-w-0 rounded-lg border bg-card px-3 py-2.5">
      <p className="text-sm font-semibold">
        {title}
        {used > 0 ? (
          <span className="font-medium text-muted-foreground"> — {formatLeaveDayCount(used)}</span>
        ) : null}
      </p>
      {used <= 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {sortedDates.map((date) => (
            <li key={date} className="flex items-center gap-2 text-sm text-foreground">
              <span className="size-1 shrink-0 rounded-full bg-foreground/45" aria-hidden />
              {formatLeaveUsageDate(date)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Leave Usage
                </h3>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <LeaveUsageBlock
                    title="CL"
                    days={attendance?.clDays ?? 0}
                    dates={attendance?.clDates ?? []}
                    emptyLabel="No CL taken this month"
                  />
                  <LeaveUsageBlock
                    title="EL"
                    days={attendance?.elDays ?? 0}
                    dates={attendance?.elDates ?? []}
                    emptyLabel="No EL taken this month"
                  />
                </div>
              </section>

              {attendance ? (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Attendance summary
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <StatTile label="Present" value={String(attendance.presentDays)} />
                    <StatTile label="Holiday" value={String(attendance.holidayCount ?? 0)} />
                    <StatTile label="LOP" value={String(attendance.lopDays)} />
                    <StatTile
                      label="Paid days"
                      value={String(
                        attendance.paidDays ??
                          attendance.presentDays +
                            (attendance.holidayCount ?? 0) +
                            (attendance.paidLeaveDays ?? attendance.leaveDays ?? 0),
                      )}
                    />
                    <StatTile label="Working days" value={String(attendance.workingDays)} />
                  </div>
                </section>
              ) : null}

              <div className="grid items-start gap-4 sm:grid-cols-2">
                <LineItemsSection
                  title="Earnings"
                  lines={systemEarnings}
                  emptyLabel="No earnings"
                />
                <LineItemsSection
                  title="Deductions"
                  lines={systemDeductions}
                  emptyLabel="No deductions"
                />
              </div>

              <section className="mt-auto rounded-lg border bg-muted/20 px-3 py-2.5">
                <PayrollNetLine
                  monthlySalary={amounts.monthlySalary}
                  attendanceEarnings={amounts.attendanceEarnings}
                  deductions={amounts.deductions}
                  netSalary={amounts.netSalary}
                  lopAmount={
                    systemDeductions
                      .filter(isLopDeductionLine)
                      .reduce((sum, line) => sum + Number(line.amount || 0), 0) ||
                    Number(attendance?.lopDeductionAmount || 0)
                  }
                />
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
