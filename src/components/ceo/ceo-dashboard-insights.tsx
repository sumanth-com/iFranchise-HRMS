import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { CeoInsight, CeoInsightPriority } from "@/types/ceo-dashboard";
import { cn } from "@/lib/utils";

function priorityBadge(priority: CeoInsightPriority) {
  switch (priority) {
    case "high":
      return "bg-destructive/10 text-destructive";
    case "medium":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    default:
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
}

function priorityBorder(priority: CeoInsightPriority) {
  switch (priority) {
    case "high":
      return "border-l-destructive";
    case "medium":
      return "border-l-amber-500";
    default:
      return "border-l-emerald-500";
  }
}

export function CeoDashboardInsights({ insights }: { insights: CeoInsight[] }) {
  const topInsights = insights
    .filter((insight) => insight.priority === "high" || insight.priority === "medium")
    .slice(0, 3);

  if (topInsights.length === 0) return null;

  const gridCols =
    topInsights.length === 1
      ? "grid-cols-1"
      : topInsights.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  return (
    <section className="w-full shrink-0" aria-label="Executive alerts">
      <ul className={cn("grid w-full gap-3", gridCols)}>
        {topInsights.map((insight) => {
          const cardClass = cn(
            "flex h-full w-full min-w-0 flex-col justify-between rounded-xl border border-l-[3px] bg-card px-4 py-3 shadow-sm transition-colors",
            priorityBorder(insight.priority),
            insight.href && "hover:border-primary/30 hover:bg-primary/[0.02]",
          );

          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold tracking-tight">{insight.title}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                    priorityBadge(insight.priority),
                  )}
                >
                  {insight.priority}
                </span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {insight.description}
                </p>
                {insight.href ? (
                  <ArrowRight className="mb-0.5 size-4 shrink-0 text-muted-foreground" />
                ) : null}
              </div>
            </>
          );

          return (
            <li key={insight.id} className="min-w-0">
              {insight.href ? (
                <Link href={insight.href} className={cardClass}>
                  {content}
                </Link>
              ) : (
                <div className={cardClass}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
