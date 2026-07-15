import {
  CeoChartPanel,
  CeoStatCard,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoAnalyticsPerformance } from "@/types/ceo-analytics";

export function CeoAnalyticsPerformancePanel({
  performance,
}: {
  performance: CeoAnalyticsPerformance;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Performance Analytics</h2>
        <p className="text-xs text-muted-foreground">
          Ratings, goals, promotions, and department performance gaps.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CeoStatCard
          label="Average Rating"
          value={performance.averageRating.toFixed(1)}
        />
        <CeoStatCard
          label="Employees on PIP"
          value={String(performance.employeesOnPip)}
          accent={
            performance.employeesOnPip > 0 ? "text-amber-600 dark:text-amber-400" : undefined
          }
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <CeoChartPanel
          title="Department Comparison"
          items={performance.departmentComparison}
        />
        <CeoChartPanel
          title="Manager Comparison"
          items={performance.managerComparison}
          color="bg-sky-500"
        />
        <CeoChartPanel
          title="Goal Completion"
          items={performance.goalCompletion}
          color="bg-emerald-500"
        />
        <CeoChartPanel
          title="Promotion Pipeline"
          items={performance.promotionPipeline}
          color="bg-violet-500"
        />
        <CeoChartPanel
          title="Top Departments"
          items={performance.topDepartments}
          color="bg-teal-500"
        />
        <CeoChartPanel
          title="Low Performing Departments"
          items={performance.lowPerformingDepartments}
          color="bg-rose-500"
        />
      </div>
    </section>
  );
}
