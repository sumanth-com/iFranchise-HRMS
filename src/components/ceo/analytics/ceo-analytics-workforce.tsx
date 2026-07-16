import {
  CeoChartPanel,
  CeoStatCard,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoAnalyticsWorkforce } from "@/types/ceo-analytics";

function hasChartData(items: { value: number }[]) {
  return items.some((item) => item.value !== 0);
}

export function CeoAnalyticsWorkforcePanel({
  workforce,
}: {
  workforce: CeoAnalyticsWorkforce;
}) {
  const charts = [
    hasChartData(workforce.headcountGrowth) ? (
      <CeoChartPanel
        key="headcount"
        title="Headcount Growth"
        items={workforce.headcountGrowth}
      />
    ) : null,
    hasChartData(workforce.departmentGrowth) ? (
      <CeoChartPanel
        key="department"
        title="Department Growth"
        items={workforce.departmentGrowth}
        color="bg-sky-500"
      />
    ) : null,
    hasChartData(workforce.joiningTrend) ? (
      <CeoChartPanel
        key="joining"
        title="Joining Trend"
        items={workforce.joiningTrend}
        color="bg-emerald-500"
      />
    ) : null,
    hasChartData(workforce.employmentTypeDistribution) ? (
      <CeoChartPanel
        key="employment"
        title="Employment Type"
        items={workforce.employmentTypeDistribution}
        color="bg-violet-500"
      />
    ) : null,
  ].filter(Boolean);

  if (charts.length === 0 && workforce.averageTenureYears <= 0) return null;

  return (
    <section className="w-full space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Workforce</h2>
          <p className="text-xs text-muted-foreground">
            Headcount, growth, and workforce mix
          </p>
        </div>
        {workforce.averageTenureYears > 0 ? (
          <div className="w-full max-w-[10.5rem] sm:w-auto">
            <CeoStatCard
              label="Avg Tenure"
              value={`${workforce.averageTenureYears.toFixed(1)} yrs`}
            />
          </div>
        ) : null}
      </div>

      {charts.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">{charts}</div>
      ) : null}
    </section>
  );
}
