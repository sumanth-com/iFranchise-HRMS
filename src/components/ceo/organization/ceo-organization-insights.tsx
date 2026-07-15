import { BarRow } from "@/components/reports/report-chart-cards";
import { CeoStatCard } from "@/components/ceo/ceo-module-primitives";
import type { CeoOrgWorkforceInsights } from "@/types/ceo-organization";

function ChartBlock({
  title,
  items,
  color = "bg-primary",
}: {
  title: string;
  items: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data available.</p>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 6).map((item) => (
            <BarRow
              key={item.label}
              label={item.label}
              value={item.value}
              max={max}
              color={color}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CeoOrganizationInsights({
  insights,
}: {
  insights: CeoOrgWorkforceInsights;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Workforce Insights</h2>
        <p className="text-xs text-muted-foreground">
          Distribution and workforce signals for the selected scope.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CeoStatCard
          label="Average Experience"
          value={
            insights.averageExperienceYears != null
              ? `${insights.averageExperienceYears} yr`
              : "—"
          }
        />
        <CeoStatCard
          label="New Joiners This Month"
          value={String(insights.newJoinersThisMonth)}
        />
        <CeoStatCard
          label="Employees on Notice"
          value={String(insights.employeesOnNotice)}
          accent={
            insights.employeesOnNotice > 0 ? "text-destructive" : undefined
          }
        />
        <CeoStatCard
          label="Employees on Probation"
          value={String(insights.employeesOnProbation)}
          accent="text-amber-600 dark:text-amber-400"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ChartBlock title="Department Distribution" items={insights.departmentDistribution} />
        <ChartBlock
          title="Employment Type Distribution"
          items={insights.employmentTypeDistribution}
          color="bg-sky-500"
        />
        <ChartBlock
          title="Manager Distribution"
          items={insights.managerDistribution}
          color="bg-indigo-500"
        />
      </div>
    </section>
  );
}
