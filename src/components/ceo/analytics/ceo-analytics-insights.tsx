import { cn } from "@/lib/utils";
import {
  CeoAnalyticsEmptyNote,
  CeoAnalyticsSectionHeading,
} from "@/components/ceo/analytics/ceo-analytics-section-heading";
import type { CeoAnalyticsInsight } from "@/types/ceo-analytics";

function priorityStyles(priority: CeoAnalyticsInsight["priority"]) {
  switch (priority) {
    case "high":
      return {
        border: "border-l-destructive",
        badge: "bg-destructive/10 text-destructive",
      };
    case "medium":
      return {
        border: "border-l-amber-500",
        badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      };
    default:
      return {
        border: "border-l-emerald-500",
        badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      };
  }
}

export function CeoAnalyticsInsights({
  insights,
}: {
  insights: CeoAnalyticsInsight[];
}) {
  return (
    <section className="w-full space-y-3">
      <CeoAnalyticsSectionHeading
        title="Executive Insights"
        description="Signals that need attention across workforce, hiring, attendance, and payroll"
        helpKey="insights"
      />

      {insights.length === 0 ? (
        <CeoAnalyticsEmptyNote message="No signals for this period." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((insight) => {
            const styles = priorityStyles(insight.priority);
            return (
              <article
                key={insight.id}
                className={cn(
                  "rounded-xl border border-l-[3px] bg-card px-4 py-3.5 shadow-sm",
                  styles.border,
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold tracking-tight">{insight.title}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                      styles.badge,
                    )}
                  >
                    {insight.priority}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {insight.description}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
