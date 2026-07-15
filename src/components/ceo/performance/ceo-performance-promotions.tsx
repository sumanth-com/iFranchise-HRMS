import {
  CeoChartPanel,
  CeoStatCard,
} from "@/components/ceo/ceo-module-primitives";
import { PROMOTION_STATUS_LABELS } from "@/lib/performance/constants";
import type { CeoPerformancePromotionOverview } from "@/types/ceo-performance";
import type { PromotionStatus } from "@/types/performance";

export function CeoPerformancePromotions({
  promotions,
}: {
  promotions: CeoPerformancePromotionOverview;
}) {
  const pipeline = promotions.pipeline.map((item) => ({
    label:
      PROMOTION_STATUS_LABELS[item.label as PromotionStatus] ?? item.label,
    value: item.value,
  }));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Promotion Overview</h2>
        <p className="text-xs text-muted-foreground">
          Recommendations, approvals, and the company promotion pipeline.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CeoStatCard
          label="Promotion Recommendations"
          value={String(promotions.recommendations)}
        />
        <CeoStatCard
          label="Approved Promotions"
          value={String(promotions.approved)}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <CeoStatCard
          label="Pending Promotions"
          value={String(promotions.pending)}
          accent="text-amber-600 dark:text-amber-400"
        />
        <CeoStatCard
          label="Rejected Promotions"
          value={String(promotions.rejected)}
          accent={promotions.rejected > 0 ? "text-destructive" : undefined}
        />
      </div>

      <CeoChartPanel
        title="Promotion Pipeline"
        items={pipeline}
        color="bg-violet-500"
      />
    </section>
  );
}
