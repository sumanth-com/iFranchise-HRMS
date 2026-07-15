import {
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoPerformanceKpis } from "@/types/ceo-performance";

export function CeoPerformanceSummary({ kpis }: { kpis: CeoPerformanceKpis }) {
  return (
    <section
      aria-label="Performance KPIs"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8"
    >
      <CeoStatCard
        label="Company Average Rating"
        value={kpis.companyAverageRating.toFixed(1)}
      />
      <CeoStatCard label="Completed Reviews" value={String(kpis.completedReviews)} />
      <CeoStatCard
        label="Pending Reviews"
        value={String(kpis.pendingReviews)}
        accent={kpis.pendingReviews > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
      />
      <CeoStatCard
        label="Promotion Recommendations"
        value={String(kpis.promotionRecommendations)}
      />
      <CeoStatCard
        label="Employees on PIP"
        value={String(kpis.employeesOnPip)}
        accent={kpis.employeesOnPip > 0 ? "text-destructive" : undefined}
      />
      <CeoStatCard
        label="High Performers"
        value={String(kpis.highPerformers)}
        accent="text-emerald-600 dark:text-emerald-400"
      />
      <CeoStatCard
        label="Average Goal Completion"
        value={formatCeoPercent(kpis.averageGoalCompletion)}
      />
      <CeoStatCard label="Performance Index" value={String(kpis.performanceIndex)} />
    </section>
  );
}
