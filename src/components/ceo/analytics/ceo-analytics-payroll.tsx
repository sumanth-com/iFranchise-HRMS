import {
  CeoChartPanel,
  CeoStatCard,
  formatCeoCurrency,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoAnalyticsPayroll } from "@/types/ceo-analytics";

export function CeoAnalyticsPayrollPanel({ payroll }: { payroll: CeoAnalyticsPayroll }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Payroll Analytics</h2>
        <p className="text-xs text-muted-foreground">
          Cost trends, department spend, salary bands, bonuses, and benefits.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <CeoStatCard
          label="Average Salary"
          value={formatCeoCurrency(payroll.averageSalary)}
        />
        <CeoStatCard
          label="Benefits Cost"
          value={formatCeoCurrency(payroll.benefitsCost)}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <CeoChartPanel
          title="Payroll Cost Trend"
          items={payroll.payrollCostTrend}
          formatValue={formatCeoCurrency}
        />
        <CeoChartPanel
          title="Department Payroll"
          items={payroll.departmentPayroll}
          color="bg-violet-500"
          formatValue={formatCeoCurrency}
        />
        <CeoChartPanel
          title="Salary Distribution"
          items={payroll.salaryDistribution}
          color="bg-indigo-500"
        />
        <CeoChartPanel
          title="Bonus Trend"
          items={payroll.bonusTrend}
          color="bg-amber-500"
          formatValue={formatCeoCurrency}
        />
        <CeoChartPanel
          title="Payroll Growth"
          items={payroll.payrollGrowth}
          color="bg-rose-500"
        />
      </div>
    </section>
  );
}
