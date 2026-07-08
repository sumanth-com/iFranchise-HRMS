import {
  Award,
  Calendar,
  MessageSquare,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import { PERFORMANCE_SUMMARY_LABELS } from "@/lib/performance/constants";
import type { PerformanceSummary } from "@/types/performance";

type PerformanceSummaryCardsProps = {
  summary: PerformanceSummary;
};

const CARDS = [
  { key: "activeGoals" as const, icon: Target, accent: "text-blue-600", bg: "bg-blue-500/10", suffix: "" },
  { key: "goalCompletionRate" as const, icon: TrendingUp, accent: "text-emerald-600", bg: "bg-emerald-500/10", suffix: "%" },
  { key: "pendingReviews" as const, icon: Users, accent: "text-amber-600", bg: "bg-amber-500/10", suffix: "" },
  { key: "averageRating" as const, icon: Star, accent: "text-violet-600", bg: "bg-violet-500/10", suffix: "/5" },
  { key: "promotionReady" as const, icon: Award, accent: "text-rose-600", bg: "bg-rose-500/10", suffix: "" },
  { key: "feedbackCount" as const, icon: MessageSquare, accent: "text-cyan-600", bg: "bg-cyan-500/10", suffix: "" },
  { key: "upcomingMeetings" as const, icon: Calendar, accent: "text-primary", bg: "bg-primary/10", suffix: "" },
];

export function PerformanceSummaryCards({ summary }: PerformanceSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = summary[card.key];
        return (
          <div key={card.key} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {PERFORMANCE_SUMMARY_LABELS[card.key]}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {value}
                  {card.suffix}
                </p>
              </div>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
