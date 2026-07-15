import {
  CeoStatCard,
  formatCeoCurrency,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoPayrollInsights } from "@/types/ceo-payroll";

export function CeoPayrollInsights({
  insights,
}: {
  insights: CeoPayrollInsights;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Executive Insights</h2>
        <p className="text-xs text-muted-foreground">
          High/low cost departments, growth, revisions, bonuses, and optimization signals.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CeoStatCard
          label="Highest Payroll Department"
          value={
            insights.highestPayrollDepartment
              ? `${insights.highestPayrollDepartment.label}`
              : "—"
          }
        />
        <CeoStatCard
          label="Highest Cost"
          value={
            insights.highestPayrollDepartment
              ? formatCeoCurrency(insights.highestPayrollDepartment.value)
              : "—"
          }
        />
        <CeoStatCard
          label="Lowest Payroll Department"
          value={
            insights.lowestPayrollDepartment
              ? insights.lowestPayrollDepartment.label
              : "—"
          }
        />
        <CeoStatCard
          label="Payroll Growth"
          value={formatCeoPercent(insights.payrollGrowthPercent)}
          accent={
            insights.payrollGrowthPercent > 10
              ? "text-amber-600 dark:text-amber-400"
              : undefined
          }
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Salary Increase Summary</h3>
          <ul className="space-y-2 text-sm">
            {insights.salaryIncreaseSummary.map((item) => (
              <li key={item.label} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="tabular-nums font-medium">
                  {item.label.includes("Increase")
                    ? formatCeoCurrency(item.value)
                    : item.value}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Bonus Summary</h3>
          <ul className="space-y-2 text-sm">
            {insights.bonusSummary.map((item) => (
              <li key={item.label} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="tabular-nums font-medium">
                  {item.label === "Bonus Count"
                    ? item.value
                    : formatCeoCurrency(item.value)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Upcoming Payroll Run</h3>
          <p className="text-sm font-medium">
            {insights.upcomingPayrollRun
              ? new Date(insights.upcomingPayrollRun).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"}
          </p>
          <h4 className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Cost Optimization Insights
          </h4>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            {insights.costOptimizationInsights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
