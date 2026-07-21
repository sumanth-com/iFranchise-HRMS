"use client";

import Link from "next/link";

import { PayrollMonthlyOverview } from "@/components/payroll/payroll-monthly-overview";
import { PayrollRunsTable } from "@/components/payroll/payroll-runs-table";
import { PayrollSummaryCards } from "@/components/payroll/payroll-summary-cards";
import { buttonVariants } from "@/components/common/button";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import type { PayrollListItem, PayrollSummary } from "@/types/payroll";
import { cn } from "@/lib/utils";

type HrTeamPayrollViewProps = {
  summary: PayrollSummary;
  records: PayrollListItem[];
  total: number;
  page: number;
  pageSize: number;
  month: number;
  year: number;
  embedded?: boolean;
};

export function HrTeamPayrollView({
  summary,
  records,
  total,
  page,
  pageSize,
  month,
  year,
  embedded = false,
}: HrTeamPayrollViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {embedded ? (
            <h2 className="text-lg font-semibold tracking-tight">Team Payroll</h2>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor payroll runs, compensation, and employee payouts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={PAYROLL_ROUTES.run}
            className={cn(buttonVariants({ size: "sm" }), "h-9")}
          >
            Run Payroll
          </Link>
          <Link
            href={PAYROLL_ROUTES.history}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
          >
            View History
          </Link>
        </div>
      </div>

      <PayrollSummaryCards summary={summary} compact />

      <div className="space-y-5">
        <PayrollMonthlyOverview overview={summary.monthlyOverview} compact />

        <section className="min-h-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Recent payroll runs</h3>
              <p className="text-xs text-muted-foreground">
                Latest payroll activity for the selected period
              </p>
            </div>
            <Link
              href={PAYROLL_ROUTES.history}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <PayrollRunsTable
            records={records}
            total={total}
            page={page}
            pageSize={pageSize}
            month={month}
            year={year}
            showFilters={false}
            compact
          />
        </section>
      </div>
    </div>
  );
}
