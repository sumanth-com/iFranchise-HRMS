import { BarRow } from "@/components/reports/report-chart-cards";
import type { CeoPerformanceInsights } from "@/types/ceo-performance";

function ChartBlock({
  title,
  items,
  color = "bg-primary",
  formatValue,
}: {
  title: string;
  items: { label: string; value: number }[];
  color?: string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data available.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <BarRow
              key={item.label}
              label={item.label}
              value={item.value}
              max={max}
              color={color}
              formatValue={formatValue}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CeoPerformanceInsights({
  insights,
}: {
  insights: CeoPerformanceInsights;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Performance Insights</h2>
        <p className="text-xs text-muted-foreground">
          Distribution, comparisons, promotion readiness, and skill gaps.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <ChartBlock title="Performance Distribution" items={insights.performanceDistribution} />
        <ChartBlock
          title="Rating Distribution"
          items={insights.ratingDistribution}
          color="bg-sky-500"
        />
        <ChartBlock
          title="Department Comparison"
          items={insights.departmentComparison}
          color="bg-indigo-500"
          formatValue={(value) => value.toFixed(1)}
        />
        <ChartBlock
          title="Manager Comparison"
          items={insights.managerComparison}
          color="bg-violet-500"
          formatValue={(value) => value.toFixed(1)}
        />
        <ChartBlock
          title="Goal Achievement"
          items={insights.goalAchievement}
          color="bg-emerald-500"
        />
        <ChartBlock
          title="Promotion Readiness"
          items={insights.promotionReadiness}
          color="bg-amber-500"
        />
        <ChartBlock
          title="Training Requirement Summary"
          items={insights.trainingRequirementSummary}
          color="bg-orange-500"
        />
        <ChartBlock
          title="Skill Gap Overview"
          items={insights.skillGapOverview}
          color="bg-rose-500"
          formatValue={(value) => value.toFixed(1)}
        />
      </div>
    </section>
  );
}
