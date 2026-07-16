import {
  CeoChartPanel,
  CeoStatCard,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoAnalyticsPerformance } from "@/types/ceo-analytics";

function hasChartData(items: { value: number }[]) {
  return items.some((item) => item.value !== 0);
}

export function CeoAnalyticsPerformancePanel({
  performance,
}: {
  performance: CeoAnalyticsPerformance;
}) {
  const hasStats =
    performance.averageRating > 0 || performance.employeesOnPip > 0;

  const charts = [
    hasChartData(performance.departmentComparison) ? (
      <CeoChartPanel
        key="dept"
        title="Department Ratings"
        items={performance.departmentComparison}
      />
    ) : null,
    hasChartData(performance.goalCompletion) ? (
      <CeoChartPanel
        key="goals"
        title="Goal Completion"
        items={performance.goalCompletion}
        color="bg-emerald-500"
      />
    ) : null,
    hasChartData(performance.lowPerformingDepartments) ? (
      <CeoChartPanel
        key="low"
        title="Needs Attention"
        items={performance.lowPerformingDepartments}
        color="bg-rose-500"
      />
    ) : null,
  ].filter(Boolean);

  if (!hasStats && charts.length === 0) return null;

  return (
    <section className="w-full space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Performance</h2>
        <p className="text-xs text-muted-foreground">
          Ratings, goals, and teams that need support
        </p>
      </div>

      {hasStats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CeoStatCard
            label="Avg Rating"
            value={performance.averageRating.toFixed(1)}
          />
          <CeoStatCard
            label="On PIP"
            value={String(performance.employeesOnPip)}
            accent={
              performance.employeesOnPip > 0
                ? "text-amber-700 dark:text-amber-400"
                : undefined
            }
          />
        </div>
      ) : null}

      {charts.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">{charts}</div>
      ) : null}
    </section>
  );
}
