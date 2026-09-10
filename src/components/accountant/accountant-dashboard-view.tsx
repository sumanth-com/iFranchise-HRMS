"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Receipt,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/common/button";
import {
  EmployeeSectionCard,
  EmployeeStatCard,
} from "@/components/employee/dashboard/employee-module-primitives";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
import type { AccountantDashboardData } from "@/lib/accountant/dashboard-queries";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import { PAYROLL_STATUS_LABELS } from "@/lib/payroll/constants";
import { cn } from "@/lib/utils";

type Props = Omit<AccountantDashboardData, "links">;

export function AccountantDashboardView({
  summary,
  periodLabel,
  currentPayrollStatusLabel,
  nextActionLabel,
  lastCompletedPayroll,
  approvedReimbursements,
  reimbursementOverview,
  recentActivity,
}: Props) {
  const attentionCount =
    summary.pendingPayroll + reimbursementOverview.pendingCount;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5 max-xl:overflow-x-visible xl:overflow-hidden">
      <div className="mx-auto flex w-full min-w-0 max-w-[88rem] flex-col gap-3 max-xl:min-h-0 xl:h-full xl:min-h-0">
        <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Finance Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {periodLabel} · {currentPayrollStatusLabel}
              {attentionCount > 0
                ? ` · ${attentionCount} item${attentionCount === 1 ? "" : "s"} need attention`
                : " · Period is clear"}
            </p>
          </div>
          <Link
            href={ACCOUNTANT_ROUTES.payrollRun}
            className={cn(
              buttonVariants({ size: "sm" }),
              "gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-600/90 hover:to-violet-600/90",
            )}
          >
            Open Team Payroll
            <ArrowRight className="size-4" />
          </Link>
        </header>

        <section
          aria-label="Period metrics"
          className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <EmployeeStatCard
            label="Payroll Period"
            value={periodLabel}
            hint={currentPayrollStatusLabel}
            icon={CalendarDays}
            accent="text-violet-600 dark:text-violet-400"
            iconBg="bg-violet-500/10"
            tone="violet"
            href={ACCOUNTANT_ROUTES.payrollRun}
          />
          <EmployeeStatCard
            label="Employees in payroll"
            value={String(summary.employeesProcessed)}
            hint={currentPayrollStatusLabel}
            icon={Users}
            accent="text-sky-600 dark:text-sky-400"
            iconBg="bg-sky-500/10"
            tone="sky"
            href={ACCOUNTANT_ROUTES.payrollRun}
          />
          <EmployeeStatCard
            label="Gross payroll"
            value={formatCurrency(summary.grossPayroll)}
            hint="This period"
            icon={Banknote}
            accent="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-500/10"
            tone="emerald"
            href={ACCOUNTANT_ROUTES.payrollRun}
          />
          <EmployeeStatCard
            label="Approved reimbursements"
            value={formatCurrency(approvedReimbursements.total)}
            hint={`${approvedReimbursements.count} claim${approvedReimbursements.count === 1 ? "" : "s"}`}
            icon={Receipt}
            accent="text-amber-700 dark:text-amber-400"
            iconBg="bg-amber-500/10"
            tone="amber"
            href={ACCOUNTANT_ROUTES.reimbursements}
          />
        </section>

        <div className="grid min-h-0 flex-1 gap-3 max-xl:flex-none lg:grid-cols-2 lg:items-stretch">
          <EmployeeSectionCard
            title="Pending Payroll Actions"
            description="What needs attention before the period closes."
            className="flex h-full min-h-0 flex-col max-xl:h-auto"
            bodyClassName="flex min-h-0 flex-1 flex-col"
            compact
            action={
              <Link
                href={ACCOUNTANT_ROUTES.payrollRun}
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "h-8 text-xs",
                )}
              >
                Open Team Payroll
              </Link>
            }
          >
            <ul className="flex flex-1 flex-col gap-2.5">
              <li className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Payroll status</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {periodLabel}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                  {currentPayrollStatusLabel}
                </span>
              </li>

              <li className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Pending payroll processing</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Draft, processing, or reviewed runs
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <ClipboardList className="size-3.5 text-muted-foreground" />
                  <p className="text-sm font-semibold tabular-nums">
                    {summary.pendingPayroll}
                  </p>
                </div>
              </li>

              <li className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Pending reimbursement settlements</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Claims awaiting settlement before close
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {reimbursementOverview.pendingCount}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {formatCurrency(reimbursementOverview.pendingTotal)}
                  </p>
                </div>
              </li>

              <li className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Next action</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Recommended step for this period
                  </p>
                </div>
                <p className="max-w-[14rem] shrink-0 text-right text-sm font-semibold">
                  {nextActionLabel}
                </p>
              </li>
            </ul>
          </EmployeeSectionCard>

          <EmployeeSectionCard
            title="Payroll Overview"
            description="Current run, last completion, and recent activity."
            className="flex h-full min-h-0 flex-col max-xl:h-auto max-xl:min-h-[16rem]"
            bodyClassName="flex min-h-0 flex-1 flex-col gap-3"
            compact
          >
            <div className="grid shrink-0 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Current status
                </p>
                <p className="mt-1 text-sm font-semibold">{currentPayrollStatusLabel}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Last completed
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  {lastCompletedPayroll ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      {lastCompletedPayroll.label}
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Next action
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold">{nextActionLabel}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Recent activity
              </p>
              <ul className="flex max-h-full min-h-0 flex-col divide-y overflow-y-auto rounded-xl border border-border/60">
                {recentActivity.length === 0 ? (
                  <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No recent payroll runs found.
                  </li>
                ) : (
                  recentActivity.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.status
                            ? (PAYROLL_STATUS_LABELS[
                                item.status as keyof typeof PAYROLL_STATUS_LABELS
                              ] ?? item.status)
                            : "—"}
                          {item.updatedAt
                            ? ` · ${new Date(item.updatedAt).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatCurrency(item.net)}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </EmployeeSectionCard>
        </div>
      </div>
    </div>
  );
}
