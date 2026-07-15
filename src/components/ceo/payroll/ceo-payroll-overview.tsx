import {
  CeoChartPanel,
  CeoStatCard,
  formatCeoCurrency,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoPayrollOverview } from "@/types/ceo-payroll";

export function CeoPayrollOverviewPanel({
  overview,
}: {
  overview: CeoPayrollOverview;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Payroll Overview</h2>
        <p className="text-xs text-muted-foreground">
          Monthly summary for {overview.monthlyLabel}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <CeoStatCard
          label="Total Salary Expense"
          value={formatCeoCurrency(overview.totalSalaryExpense)}
        />
        <CeoStatCard
          label="Benefits Expense"
          value={formatCeoCurrency(overview.benefitsExpense)}
        />
        <CeoStatCard
          label="Bonus Expense"
          value={formatCeoCurrency(overview.bonusExpense)}
        />
        <CeoStatCard
          label="Deductions"
          value={formatCeoCurrency(overview.deductions)}
        />
        <CeoStatCard
          label="Net Payroll"
          value={formatCeoCurrency(overview.netPayroll)}
        />
        <CeoStatCard
          label="Payroll Completion %"
          value={formatCeoPercent(overview.payrollCompletionPercent)}
        />
      </div>

      <CeoChartPanel
        title="Monthly Payroll Summary"
        items={overview.monthlySummary}
        color="bg-sky-500"
        formatValue={formatCeoCurrency}
      />
    </section>
  );
}
