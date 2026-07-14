"use client";

import type { TeamPerformanceTrendPoint } from "@/types/manager-performance";
import { cn } from "@/lib/utils";

type ManagerPerformanceTrendsProps = {
  trends: TeamPerformanceTrendPoint[];
};

type ChartPoint = {
  label: string;
  value: number;
};

function shortMonth(label: string) {
  return label.split(" ")[0]?.slice(0, 3) ?? label;
}

function TrendBarChart({
  title,
  subtitle,
  points,
  maxValue,
  barClassName,
  formatValue,
  gradientClassName,
}: {
  title: string;
  subtitle: string;
  points: ChartPoint[];
  maxValue: number;
  barClassName: string;
  formatValue: (value: number) => string;
  gradientClassName: string;
}) {
  const chartMax = Math.max(maxValue, 1);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm",
        gradientClassName,
      )}
    >
      <div className="relative">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>

        <div className="mt-4 flex h-36 items-end gap-2">
          {points.map((point) => {
            const height = Math.max(6, (point.value / chartMax) * 100);
            return (
              <div key={`${title}-${point.label}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                  {formatValue(point.value)}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      "mx-auto w-full max-w-8 rounded-t-md transition-all",
                      barClassName,
                    )}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="truncate text-[10px] text-muted-foreground">
                  {shortMonth(point.label)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export function ManagerPerformanceTrends({ trends }: ManagerPerformanceTrendsProps) {
  const ratingPoints = trends.map((point) => ({
    label: point.month,
    value: point.averageRating,
  }));
  const goalPoints = trends.map((point) => ({
    label: point.month,
    value: point.goalCompletionRate,
  }));
  const reviewPoints = trends.map((point) => ({
    label: point.month,
    value: point.reviewsCompleted,
  }));

  const maxRating = Math.max(...ratingPoints.map((point) => point.value), 5);
  const maxGoals = Math.max(...goalPoints.map((point) => point.value), 100);
  const maxReviews = Math.max(...reviewPoints.map((point) => point.value), 1);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <TrendBarChart
        title="Team rating trend"
        subtitle="Average review score over the last 6 months"
        points={ratingPoints}
        maxValue={maxRating}
        barClassName="bg-gradient-to-t from-indigo-600 to-indigo-400"
        gradientClassName="bg-gradient-to-br from-indigo-500/5 via-card to-card"
        formatValue={(value) => value.toFixed(1)}
      />
      <TrendBarChart
        title="Goal completion trend"
        subtitle="Share of goals completed each month"
        points={goalPoints}
        maxValue={maxGoals}
        barClassName="bg-gradient-to-t from-emerald-600 to-emerald-400"
        gradientClassName="bg-gradient-to-br from-emerald-500/5 via-card to-card"
        formatValue={(value) => `${value}%`}
      />
      <TrendBarChart
        title="Reviews completed"
        subtitle="Approved reviews finished each month"
        points={reviewPoints}
        maxValue={maxReviews}
        barClassName="bg-gradient-to-t from-violet-600 to-violet-400"
        gradientClassName="bg-gradient-to-br from-violet-500/5 via-card to-card"
        formatValue={(value) => String(value)}
      />
    </section>
  );
}
