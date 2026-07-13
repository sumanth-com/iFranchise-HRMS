import {
  Award,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";

import type { PerformanceSummary } from "@/types/performance";

type PerformanceSummaryCardsProps = {
  summary: PerformanceSummary;
};

const CARDS = [
  {
    label: "Active goals",
    value: (summary: PerformanceSummary) => summary.activeGoals,
    helper: (summary: PerformanceSummary) => `${summary.completedGoals} completed`,
    icon: Target,
    accent: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  {
    label: "Goal completion",
    value: (summary: PerformanceSummary) => `${summary.goalCompletionRate}%`,
    helper: () => "Overall progress",
    icon: TrendingUp,
    accent: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
  {
    label: "KPI completion",
    value: (summary: PerformanceSummary) => `${summary.averageKpiCompletion}%`,
    helper: (summary: PerformanceSummary) => `${summary.activeKpis} active KPIs`,
    icon: TrendingUp,
    accent: "text-cyan-600",
    bg: "bg-cyan-500/10",
  },
  {
    label: "Average rating",
    value: (summary: PerformanceSummary) => `${summary.averageRating}/5`,
    helper: () => "Review quality",
    icon: Star,
    accent: "text-violet-600",
    bg: "bg-violet-500/10",
  },
  {
    label: "Promotion ready",
    value: (summary: PerformanceSummary) => summary.promotionReady,
    helper: (summary: PerformanceSummary) =>
      summary.topPerformingDepartment ? `Top: ${summary.topPerformingDepartment}` : "Ready employees",
    icon: Award,
    accent: "text-rose-600",
    bg: "bg-rose-500/10",
  },
];

export function PerformanceSummaryCards({ summary }: PerformanceSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-2xl border bg-gradient-to-br from-card via-card to-muted/30 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{card.value(summary)}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{card.helper(summary)}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
