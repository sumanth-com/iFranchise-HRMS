"use client";

import { cn } from "@/lib/utils";

type TrendPoint = { label: string; value: number };

function shortLabel(label: string) {
  const parts = label.split(" ");
  if (parts.length >= 2) return parts[0]?.slice(0, 3) ?? label;
  return label.slice(0, 3);
}

export function CeoAttendanceTrendChart({
  title,
  points,
  formatValue = (value) => `${value}%`,
  barClassName = "bg-gradient-to-t from-sky-600 to-sky-400",
  shellClassName = "bg-gradient-to-br from-sky-500/8 via-card to-card",
  maxValue = 100,
  emptyMessage = "No trend data for this period.",
}: {
  title: string;
  points: TrendPoint[];
  formatValue?: (value: number) => string;
  barClassName?: string;
  shellClassName?: string;
  maxValue?: number;
  emptyMessage?: string;
}) {
  const displayPoints = points.filter((point) => point.value > 0);
  if (displayPoints.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const chartMax = Math.max(maxValue, ...displayPoints.map((point) => point.value), 1);
  const width = 100;
  const height = 56;
  const step = width / Math.max(displayPoints.length - 1, 1);
  const areaPoints = displayPoints.map((point, index) => {
    const x = displayPoints.length === 1 ? width / 2 : index * step;
    const y = height - (point.value / chartMax) * height;
    return `${x},${y}`;
  });
  const areaPath = `M 0,${height} L ${areaPoints.join(" L ")} L ${width},${height} Z`;
  const linePath = areaPoints.join(" L ");

  return (
    <div className={cn("relative overflow-hidden rounded-xl border p-3", shellClassName)}>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>

      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="pointer-events-none absolute inset-x-3 bottom-10 h-24 w-[calc(100%-1.5rem)] text-sky-500/20"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={areaPath} fill="currentColor" />
          <path
            d={`M ${linePath}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-sky-500/50"
          />
        </svg>

        <div className="relative flex h-36 items-end gap-1.5 px-1">
          {displayPoints.map((point) => {
            const barHeight = Math.max(8, (point.value / chartMax) * 100);
            return (
              <div
                key={point.label}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              >
                <span className="text-[10px] font-semibold tabular-nums text-foreground">
                  {formatValue(point.value)}
                </span>
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className={cn(
                      "w-full max-w-9 rounded-t-lg shadow-sm transition-all",
                      barClassName,
                    )}
                    style={{ height: `${barHeight}%` }}
                    title={`${point.label}: ${formatValue(point.value)}`}
                  />
                </div>
                <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                  {shortLabel(point.label)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
