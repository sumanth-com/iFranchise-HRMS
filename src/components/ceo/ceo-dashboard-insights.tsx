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
  const topInsights = insights.slice(0, 3);

  if (topInsights.length === 0) return null;

  return (
    <section className="shrink-0" aria-label="Executive insights">
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {topInsights.map((insight) => {
          const content = (
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{insight.title}</p>
                <p className="truncate text-xs text-muted-foreground">{insight.description}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                  priorityBadge(insight.priority),
                )}
              >
                {insight.priority}
              </span>
              {insight.href ? (
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
              ) : null}
            </div>
          );

          return (
            <li key={insight.id}>
              {insight.href ? (
                <Link
                  href={insight.href}
                  className={cn(
                    "block rounded-lg border border-l-[3px] bg-card px-3 py-2 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.02]",
                    priorityBorder(insight.priority),
                  )}
                >
                  {content}
                </Link>
              ) : (
                <div
                  className={cn(
                    "rounded-lg border border-l-[3px] bg-card px-3 py-2 shadow-sm",
                    priorityBorder(insight.priority),
                  )}
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
