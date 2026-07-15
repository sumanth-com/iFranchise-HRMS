import { cn } from "@/lib/utils";
import type {
  CeoAnalyticsComparison,
  CeoAnalyticsInsight,
} from "@/types/ceo-analytics";

function priorityClass(priority: CeoAnalyticsInsight["priority"]) {
  switch (priority) {
    case "high":
      return "border-l-destructive text-destructive";
    case "medium":
      return "border-l-amber-500 text-amber-700 dark:text-amber-400";
    default:
      return "border-l-emerald-500 text-emerald-700 dark:text-emerald-400";
  }
}

export function CeoAnalyticsInsights({
  insights,
}: {
  insights: CeoAnalyticsInsight[];
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Executive Insights</h2>
        <p className="text-xs text-muted-foreground">
          Automatically generated signals from workforce, hiring, attendance, and payroll.
        </p>
      </div>

      {insights.length === 0 ? (
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground shadow-sm">
          No material executive signals for the selected filters.
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {insights.map((insight) => (
            <article
              key={insight.id}
              className={cn(
                "rounded-xl border border-l-[3px] bg-card px-4 py-3 shadow-sm",
                priorityClass(insight.priority).split(" ")[0],
              )}
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{insight.title}</p>
                <span
                  className={cn(
                    "rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                    priorityClass(insight.priority).split(" ").slice(1).join(" "),
                  )}
                >
                  {insight.priority}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{insight.description}</p>
            </article>
          ))}
        </div>
      )}
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
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Comparison Mode</h2>
        <p className="text-xs text-muted-foreground">
          {comparison.currentLabel} compared with {comparison.previousLabel}.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
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
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
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
