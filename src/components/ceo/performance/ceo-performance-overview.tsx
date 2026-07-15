import {
  CeoChartPanel,
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoPerformanceOverview } from "@/types/ceo-performance";

export function CeoPerformanceOverviewPanel({
  overview,
}: {
  overview: CeoPerformanceOverview;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Company Performance Overview</h2>
        <p className="text-xs text-muted-foreground">
          Organization-wide rating, KPI achievement, and yearly trend.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CeoStatCard
          label="Overall Company Rating"
          value={overview.overallCompanyRating.toFixed(1)}
        />
        <CeoStatCard
          label="Quarterly Performance Score"
          value={overview.quarterlyPerformanceScore.toFixed(1)}
        />
        <CeoStatCard
          label="Average KPI Achievement"
          value={formatCeoPercent(overview.averageKpiAchievement)}
        />
        <CeoStatCard
          label="Goal Completion Percentage"
          value={formatCeoPercent(overview.goalCompletionPercentage)}
        />
      </div>

      <CeoChartPanel
        title="Yearly Performance Trend"
        items={overview.yearlyTrend}
        color="bg-sky-500"
      />
    </section>
  );
}
