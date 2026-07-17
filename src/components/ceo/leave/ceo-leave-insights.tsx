import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { CeoInsightPriority } from "@/types/ceo-dashboard";
import type { CeoLeaveInsight } from "@/types/ceo-leave";

const PRIORITY_STYLES: Record<
  CeoInsightPriority,
  { icon: LucideIcon; iconClass: string; ring: string }
> = {
  high: {
    icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
    ring: "bg-amber-500/10",
  },
  medium: {
    icon: Lightbulb,
    iconClass: "text-sky-600 dark:text-sky-400",
    ring: "bg-sky-500/10",
  },
  low: {
    icon: Info,
    iconClass: "text-muted-foreground",
    ring: "bg-muted",
  },
};

export function CeoLeaveInsights({ insights }: { insights: CeoLeaveInsight[] }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold tracking-tight">Executive Insights</h2>
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">No insights available right now.</p>
      ) : (
        <ul className="space-y-2.5">
          {insights.map((insight) => {
            const style = PRIORITY_STYLES[insight.priority];
            const Icon = style.icon;
            return (
              <li key={insight.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${style.ring}`}
                >
                  <Icon className={`size-3.5 ${style.iconClass}`} />
                </span>
                <p className="text-sm leading-relaxed">{insight.message}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
