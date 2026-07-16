import {
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoPerformanceKpis } from "@/types/ceo-performance";

export function CeoPerformanceSummary({ kpis }: { kpis: CeoPerformanceKpis }) {
  return (
    <section
      aria-label="Performance KPIs"
      className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      <CeoStatCard
        label="Avg Rating"
        value={kpis.companyAverageRating.toFixed(1)}
      />
      <CeoStatCard
        label="Pending Reviews"
        value={String(kpis.pendingReviews)}
        accent={kpis.pendingReviews > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
      />
      <CeoStatCard
        label="High Performers"
        value={String(kpis.highPerformers)}
        accent="text-emerald-600 dark:text-emerald-400"
      />
      <CeoStatCard
        label="On PIP"
        value={String(kpis.employeesOnPip)}
        accent={kpis.employeesOnPip > 0 ? "text-destructive" : undefined}
      />
      <CeoStatCard
        label="Goal Completion"
        value={formatCeoPercent(kpis.averageGoalCompletion)}
      />
      <CeoStatCard
        label="Promotions"
        value={String(kpis.promotionRecommendations)}
        accent={
          kpis.promotionRecommendations > 0
            ? "text-violet-600 dark:text-violet-400"
            : undefined
        }
      />
    </section>
  );
}
