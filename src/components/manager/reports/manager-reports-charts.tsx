import { format, parse } from "date-fns";

import { cn } from "@/lib/utils";
import type { ManagerReportsTrends } from "@/types/manager-reports";
import type { ChartSeriesItem } from "@/types/reports";

function parseTrendLabel(label: string) {
  const yyyyMm = parse(label, "yyyy-MM", new Date());
  if (!Number.isNaN(yyyyMm.getTime())) return yyyyMm;
  const mmmYyyy = parse(label, "MMM yyyy", new Date());
  if (!Number.isNaN(mmmYyyy.getTime())) return mmmYyyy;
  return null;
}

function formatMonthLabel(label: string) {
  const parsed = parseTrendLabel(label);
  return parsed ? format(parsed, "MMM yyyy") : label;
}

function shortMonth(label: string) {
  const parsed = parseTrendLabel(label);
  return parsed ? format(parsed, "MMM") : label.slice(0, 3);
}

function hasTrendData(data: ChartSeriesItem[]) {
  return data.some((item) => item.value > 0);
}

function TrendBarChart({
  title,
  subtitle,
  data,
  barClassName,
  gradientClassName,
  formatValue,
}: {
  title: string;
  subtitle: string;
  data: ChartSeriesItem[];
  barClassName: string;
  gradientClassName: string;
  formatValue: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));

  if (!data.length) {
    return (
      <article className="rounded-2xl border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        <p className="mt-6 text-sm text-muted-foreground">No data for the last 6 months.</p>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm",
        gradientClassName,
      )}
    >
      <div className="relative">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>

        {!hasTrendData(data) ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No activity recorded in the last 6 months.
          </p>
        ) : (
          <div className="mt-4 flex h-32 items-end gap-2">
            {data.map((item) => {
              const height = Math.max(8, (item.value / max) * 100);
              return (
                <div
                  key={`${title}-${item.label}`}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                  title={`${formatMonthLabel(item.label)}: ${formatValue(item.value)}`}
                >
                  <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                    {formatValue(item.value)}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={cn(
                        "mx-auto w-full max-w-9 rounded-t-md transition-all",
                        barClassName,
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {shortMonth(item.label)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}

const CORE_TRENDS = [
  {
    key: "attendanceTrend" as const,
    title: "Attendance",
    subtitle: "Present / late days per month",
    barClassName: "bg-emerald-500",
    gradientClassName: "bg-gradient-to-br from-emerald-500/[0.06] to-transparent",
    formatValue: (value: number) => String(value),
  },
  {
    key: "leaveTrend" as const,
    title: "Leave",
    subtitle: "Approved leave days per month",
    barClassName: "bg-indigo-500",
    gradientClassName: "bg-gradient-to-br from-indigo-500/[0.06] to-transparent",
    formatValue: (value: number) => String(value),
  },
  {
    key: "performanceTrend" as const,
    title: "Performance",
    subtitle: "Average team rating per month",
    barClassName: "bg-violet-500",
    gradientClassName: "bg-gradient-to-br from-violet-500/[0.06] to-transparent",
    formatValue: (value: number) => (value > 0 ? value.toFixed(1) : "—"),
  },
];

export function ManagerReportsCharts({ trends }: { trends: ManagerReportsTrends }) {
  const visibleTrends = CORE_TRENDS.map((config) => ({
    ...config,
    data: trends[config.key],
  }));

  const hasAnyData = visibleTrends.some((trend) => hasTrendData(trend.data));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Team Trends</h2>
        <p className="text-sm text-muted-foreground">
          Last 6 months for attendance, leave, and performance in your team.
        </p>
      </div>

      {!hasAnyData ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm font-medium">No trend activity yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Trends will appear once your team has attendance, leave, or performance records.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {visibleTrends.map((trend) => (
            <TrendBarChart
              key={trend.key}
              title={trend.title}
              subtitle={trend.subtitle}
              data={trend.data}
              barClassName={trend.barClassName}
              gradientClassName={trend.gradientClassName}
              formatValue={trend.formatValue}
            />
          ))}
        </div>
      )}
    </section>
  );
}
