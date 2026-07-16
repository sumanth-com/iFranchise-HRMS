"use client";

import { Calendar, IndianRupee, TrendingUp, Users, Wallet } from "lucide-react";

import { BarRow } from "@/components/reports/report-chart-cards";
import {
  formatCeoCurrency,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type {
  CeoPayrollAnalytics,
  CeoPayrollDepartmentRow,
  CeoPayrollInsights,
  CeoPayrollOverview,
} from "@/types/ceo-payroll";
import { cn } from "@/lib/utils";

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 shrink-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function SnapshotTile({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex h-full min-h-[5.5rem] flex-col justify-between rounded-lg border bg-background/80 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
          {icon}
        </span>
        <p className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</p>
      </div>
      <div className="mt-2">
        <p className="text-xs font-medium">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function DepartmentPayrollPanel({
  departments,
  analytics,
}: {
  departments: CeoPayrollDepartmentRow[];
  analytics: CeoPayrollAnalytics;
}) {
  const fromDepartments = departments
    .filter((item) => item.monthlyCost > 0)
    .sort((a, b) => b.monthlyCost - a.monthlyCost)
    .slice(0, 5)
    .map((item) => ({ label: item.name, value: item.monthlyCost }));

  const fromAnalytics = analytics.departmentCost.filter((item) => item.value > 0).slice(0, 5);
  const items = fromDepartments.length > 0 ? fromDepartments : fromAnalytics;
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <Panel title="By Department" subtitle="Where payroll spend sits">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No department payroll data yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <BarRow
              key={item.label}
              label={item.label}
              value={item.value}
              max={max}
              color="bg-primary"
              formatValue={formatCeoCurrency}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function FinancialSnapshotPanel({
  overview,
  analytics,
  insights,
}: {
  overview: CeoPayrollOverview;
  analytics: CeoPayrollAnalytics;
  insights: CeoPayrollInsights;
}) {
  const upcomingLabel = insights.upcomingPayrollRun
    ? new Date(insights.upcomingPayrollRun).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not scheduled";

  const highestDept = insights.highestPayrollDepartment;
  const costBreakdown = overview.monthlySummary.filter((item) => item.value > 0);
  const breakdownMax = Math.max(1, ...costBreakdown.map((item) => item.value));

  return (
    <Panel title="Financial Snapshot" subtitle={overview.monthlyLabel}>
      {costBreakdown.length > 0 ? (
        <div className="mb-3 space-y-2 rounded-lg border bg-background/80 px-3 py-2.5">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Cost Breakdown
          </p>
          {costBreakdown.map((item) => (
            <BarRow
              key={item.label}
              label={item.label}
              value={item.value}
              max={breakdownMax}
              color="bg-primary"
              formatValue={formatCeoCurrency}
            />
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <SnapshotTile
          label="Net Payroll"
          value={formatCeoCurrency(overview.netPayroll)}
          detail={`Salary ${formatCeoCurrency(overview.totalSalaryExpense)}`}
          icon={<Wallet className="size-3.5" />}
        />
        <SnapshotTile
          label="Completion"
          value={formatCeoPercent(overview.payrollCompletionPercent)}
          detail="Employees processed this cycle"
          icon={<Users className="size-3.5" />}
          tone={
            overview.payrollCompletionPercent < 100
              ? "text-amber-700 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400"
          }
        />
        <SnapshotTile
          label="Cost / Employee"
          value={formatCeoCurrency(analytics.costPerEmployee)}
          detail="Average cost for selected period"
          icon={<IndianRupee className="size-3.5" />}
        />
        <SnapshotTile
          label="Growth"
          value={formatCeoPercent(insights.payrollGrowthPercent)}
          detail="Month-over-month change"
          icon={<TrendingUp className="size-3.5" />}
          tone={
            insights.payrollGrowthPercent > 10
              ? "text-amber-700 dark:text-amber-400"
              : undefined
          }
        />
        <SnapshotTile
          label="Next Run"
          value={upcomingLabel}
          detail="Upcoming payroll date"
          icon={<Calendar className="size-3.5" />}
        />
        <SnapshotTile
          label="Top Department"
          value={highestDept ? highestDept.label : "—"}
          detail={
            highestDept
              ? formatCeoCurrency(highestDept.value)
              : "No department cost data"
          }
          icon={<Wallet className="size-3.5" />}
        />
      </div>

      {insights.costOptimizationInsights.length > 0 ? (
        <div className="mt-3 rounded-lg border bg-background/80 px-3 py-2.5">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Insight
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {insights.costOptimizationInsights[0]}
          </p>
        </div>
      ) : null}
    </Panel>
  );
}

export function CeoPayrollPanels({
  departments,
  overview,
  analytics,
  insights,
}: {
  departments: CeoPayrollDepartmentRow[];
  overview: CeoPayrollOverview;
  analytics: CeoPayrollAnalytics;
  insights: CeoPayrollInsights;
}) {
  return (
    <div className="grid w-full shrink-0 gap-3 lg:grid-cols-2 lg:items-stretch">
      <DepartmentPayrollPanel departments={departments} analytics={analytics} />
      <FinancialSnapshotPanel
        overview={overview}
        analytics={analytics}
        insights={insights}
      />
    </div>
  );
}
