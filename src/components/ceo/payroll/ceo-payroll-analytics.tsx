import { BarRow } from "@/components/reports/report-chart-cards";
import {
  CeoStatCard,
  formatCeoCurrency,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoPayrollAnalytics } from "@/types/ceo-payroll";

function ChartBlock({
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
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data available.</p>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 8).map((item) => (
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
      )}
    </section>
  );
}

export function CeoPayrollAnalytics({
  analytics,
}: {
  analytics: CeoPayrollAnalytics;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Payroll Analytics</h2>
        <p className="text-xs text-muted-foreground">
          Trends, department cost, salary bands, and month-over-month comparison.
        </p>
      </div>

      <CeoStatCard
        label="Cost Per Employee"
        value={formatCeoCurrency(analytics.costPerEmployee)}
      />

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <ChartBlock
          title="Monthly Payroll Trend"
          items={analytics.monthlyTrend}
          formatValue={formatCeoCurrency}
        />
        <ChartBlock
          title="Department-wise Payroll Cost"
          items={analytics.departmentCost}
          color="bg-sky-500"
          formatValue={formatCeoCurrency}
        />
        <ChartBlock
          title="Salary Distribution"
          items={analytics.salaryDistribution}
          color="bg-indigo-500"
        />
        <ChartBlock
          title="Benefits Distribution"
          items={analytics.benefitsDistribution}
          color="bg-emerald-500"
          formatValue={formatCeoCurrency}
        />
        <ChartBlock
          title="Bonus Distribution"
          items={analytics.bonusDistribution}
          color="bg-amber-500"
          formatValue={formatCeoCurrency}
        />
        <ChartBlock
          title="Payroll Growth"
          items={analytics.payrollGrowth}
          color="bg-violet-500"
          formatValue={(value) => `${value}%`}
        />
        <ChartBlock
          title="Average Salary by Department"
          items={analytics.averageSalaryByDepartment}
          color="bg-rose-500"
          formatValue={formatCeoCurrency}
        />
        <ChartBlock
          title="Payroll Comparison (Current vs Previous Month)"
          items={analytics.comparison}
          color="bg-cyan-500"
          formatValue={formatCeoCurrency}
        />
      </div>
    </section>
  );
}
