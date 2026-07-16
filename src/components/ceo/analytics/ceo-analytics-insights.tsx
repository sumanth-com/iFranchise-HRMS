import { cn } from "@/lib/utils";
import type {
  CeoAnalyticsComparison,
  CeoAnalyticsInsight,
} from "@/types/ceo-analytics";

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
  if (insights.length === 0) return null;

  return (
    <section className="w-full space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Executive Insights</h2>
        <p className="text-xs text-muted-foreground">
          Signals that need attention across workforce, hiring, attendance, and payroll
        </p>
      </div>

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
    </section>
  );
}

export function CeoAnalyticsComparisonPanel({
  comparison,
}: {
  comparison: CeoAnalyticsComparison;
}) {
  if (comparison.mode === "none") return null;

  return (
    <section className="w-full space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Comparison</h2>
        <p className="text-xs text-muted-foreground">
          {comparison.currentLabel} vs {comparison.previousLabel}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2.5 font-medium">Metric</th>
              <th className="px-4 py-2.5 font-medium">Current</th>
              <th className="px-4 py-2.5 font-medium">Previous</th>
              <th className="px-4 py-2.5 font-medium">Delta %</th>
            </tr>
          </thead>
          <tbody>
            {comparison.metrics.map((metric) => (
              <tr key={metric.label} className="border-t">
                <td className="px-4 py-2.5">{metric.label}</td>
                <td className="px-4 py-2.5 tabular-nums">{metric.current}</td>
                <td className="px-4 py-2.5 tabular-nums">{metric.previous}</td>
                <td
                  className={cn(
                    "px-4 py-2.5 tabular-nums",
                    metric.deltaPercent > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : metric.deltaPercent < 0
                        ? "text-destructive"
                        : "text-muted-foreground",
                  )}
                >
                  {metric.deltaPercent > 0 ? "+" : ""}
                  {metric.deltaPercent}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {comparison.departmentComparison ? (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="border-b px-4 py-2.5 text-sm font-medium">
            {comparison.departmentComparison.leftLabel} vs{" "}
            {comparison.departmentComparison.rightLabel}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 font-medium">Segment</th>
                <th className="px-4 py-2.5 font-medium">
                  {comparison.departmentComparison.leftLabel}
                </th>
                <th className="px-4 py-2.5 font-medium">
                  {comparison.departmentComparison.rightLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.departmentComparison.series.map((row) => (
                <tr key={row.label} className="border-t">
                  <td className="px-4 py-2.5">{row.label}</td>
                  <td className="px-4 py-2.5 tabular-nums">{row.left}</td>
                  <td className="px-4 py-2.5 tabular-nums">{row.right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
