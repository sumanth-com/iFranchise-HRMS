import {
  CeoChartPanel,
  CeoStatCard,
  formatCeoCurrency,
} from "@/components/ceo/ceo-module-primitives";
import {
  CeoAnalyticsEmptyNote,
  CeoAnalyticsSectionHeading,
} from "@/components/ceo/analytics/ceo-analytics-section-heading";
import type { CeoAnalyticsPayroll } from "@/types/ceo-analytics";

function hasChartData(items: { value: number }[]) {
  return items.some((item) => item.value !== 0);
}

export function CeoAnalyticsPayrollPanel({ payroll }: { payroll: CeoAnalyticsPayroll }) {
  const hasStats = payroll.averageSalary > 0 || payroll.benefitsCost > 0;

  const charts = [
    hasChartData(payroll.payrollCostTrend) ? (
      <CeoChartPanel
        key="trend"
        title="Payroll Cost Trend"
        items={payroll.payrollCostTrend}
        formatValue={formatCeoCurrency}
      />
    ) : null,
    hasChartData(payroll.departmentPayroll) ? (
      <CeoChartPanel
        key="dept"
        title="Department Spend"
        items={payroll.departmentPayroll}
        color="bg-violet-500"
        formatValue={formatCeoCurrency}
      />
    ) : null,
    hasChartData(payroll.bonusTrend) ? (
      <CeoChartPanel
        key="bonus"
        title="Bonus Trend"
        items={payroll.bonusTrend}
        color="bg-amber-500"
        formatValue={formatCeoCurrency}
      />
    ) : null,
  ].filter(Boolean);

  return (
    <section className="w-full space-y-3">
      <CeoAnalyticsSectionHeading
        title="Payroll"
        description="Cost trends, department spend, and benefits"
        helpKey="payroll"
      />

      {hasStats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CeoStatCard
            label="Avg Salary"
            value={formatCeoCurrency(payroll.averageSalary)}
          />
          <CeoStatCard
            label="Benefits"
            value={formatCeoCurrency(payroll.benefitsCost)}
          />
        </div>
      ) : null}

      {charts.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">{charts}</div>
      ) : null}

      {!hasStats && charts.length === 0 ? (
        <CeoAnalyticsEmptyNote message="No payroll data for this period." />
      ) : null}
    </section>
  );
}
