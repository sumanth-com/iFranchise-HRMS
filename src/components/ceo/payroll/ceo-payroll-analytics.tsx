import { BarRow } from "@/components/reports/report-chart-cards";
import {
  formatCeoCurrency,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoPayrollAnalytics } from "@/types/ceo-payroll";

function TrendCard({
  title,
  items,
  color = "bg-primary",
  formatValue,
}: {
  title: string;
  items: { label: string; value: number }[];
  color?: string;
  formatValue?: (value: number) => string;
}) {
  const displayItems = items.filter((item) => item.value !== 0);
  if (displayItems.length === 0) return null;

  const max = Math.max(1, ...displayItems.map((item) => item.value));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold tracking-tight">{title}</h3>
      <div className="space-y-2.5">
        {displayItems.slice(0, 6).map((item) => (
          <BarRow
            key={item.label}
            label={item.label}
            value={item.value}
            max={max}
            color={color}
            formatValue={formatValue}
          />
        ))}
      </div>
    </section>
  );
}

function hasNonZeroItems(items: { label: string; value: number }[]) {
  return items.some((item) => item.value !== 0);
}

export function CeoPayrollAnalytics({
  analytics,
}: {
  analytics: CeoPayrollAnalytics;
}) {
  const cards: React.ReactNode[] = [];

  if (hasNonZeroItems(analytics.monthlyTrend)) {
    cards.push(
      <TrendCard
        key="trend"
        title="Monthly Payroll Trend"
        items={analytics.monthlyTrend}
        color="bg-sky-500"
        formatValue={formatCeoCurrency}
      />,
    );
  }

  if (hasNonZeroItems(analytics.comparison)) {
    cards.push(
      <TrendCard
        key="comparison"
        title="Current vs Previous Month"
        items={analytics.comparison}
        color="bg-cyan-500"
        formatValue={formatCeoCurrency}
      />,
    );
  }

  if (hasNonZeroItems(analytics.payrollGrowth)) {
    cards.push(
      <TrendCard
        key="growth"
        title="Payroll Growth"
        items={analytics.payrollGrowth}
        color="bg-violet-500"
        formatValue={(value) => formatCeoPercent(value)}
      />,
    );
  }

  if (hasNonZeroItems(analytics.averageSalaryByDepartment)) {
    cards.push(
      <TrendCard
        key="avg-salary"
        title="Avg Salary by Department"
        items={analytics.averageSalaryByDepartment}
        color="bg-rose-500"
        formatValue={formatCeoCurrency}
      />,
    );
  }

  if (cards.length === 0) return null;

  return (
    <section className="w-full">
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Payroll Trends</h2>
        <p className="text-xs text-muted-foreground">
          Month-over-month cost and workforce spend patterns
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{cards}</div>
    </section>
  );
}
