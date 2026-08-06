"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { PayrollMonthlyOverview } from "@/components/payroll/payroll-monthly-overview";
import { PayrollRunsTable } from "@/components/payroll/payroll-runs-table";
import { PayrollSummaryCards } from "@/components/payroll/payroll-summary-cards";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  getMonthSelectItems,
  getYearSelectItems,
} from "@/components/payroll/select-utils";
import { buttonVariants } from "@/components/common/button";
import { PAYROLL_ROUTES, SELF_PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { formatPayrollMonth } from "@/lib/payroll/services/payroll-utils";
import type { PayrollListItem, PayrollSummary } from "@/types/payroll";
import { cn } from "@/lib/utils";

const monthItems = getMonthSelectItems();
const yearItems = getYearSelectItems();

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
  const router = useRouter();
  const searchParams = useSearchParams();

  function updatePeriod(nextMonth: number, nextYear: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "team");
    params.set("month", String(nextMonth));
    params.set("year", String(nextYear));
    router.push(`${SELF_PAYROLL_ROUTES.list}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {embedded ? (
            <h2 className="text-lg font-semibold tracking-tight">Team Payroll</h2>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
          )}
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

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" />
          <span>Payroll period</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[9rem]">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Month</p>
            <LabeledSelect
              items={monthItems}
              value={String(month)}
              onValueChange={(value) => {
                if (!value) return;
                updatePeriod(Number.parseInt(value, 10), year);
              }}
            />
          </div>
          <div className="min-w-[7rem]">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Year</p>
            <LabeledSelect
              items={yearItems}
              value={String(year)}
              onValueChange={(value) => {
                if (!value) return;
                updatePeriod(month, Number.parseInt(value, 10));
              }}
            />
          </div>
          <p className="pb-2 text-sm text-muted-foreground">
            Viewing <span className="font-medium text-foreground">{formatPayrollMonth(month, year)}</span>
          </p>
        </div>
      </div>

      <PayrollSummaryCards summary={summary} compact />

      <div className="space-y-5">
        <PayrollMonthlyOverview
          overview={summary.monthlyOverview}
          year={year}
          compact
        />

        <section className="min-h-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Recent payroll runs</h3>
              <p className="text-xs text-muted-foreground">
                Latest activity for {formatPayrollMonth(month, year)}
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
