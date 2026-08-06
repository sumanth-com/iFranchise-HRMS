"use client";

import { useMemo, useState } from "react";

import { LabeledSelect } from "@/components/payroll/payroll-select";
import { getYearSelectItems } from "@/components/payroll/select-utils";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import { cn } from "@/lib/utils";
import type { PayrollSummary } from "@/types/payroll";

type PayrollMonthlyOverviewProps = {
  overview: PayrollSummary["monthlyOverview"];
  year: number;
  onYearChange?: (year: number) => void;
  compact?: boolean;
};

const yearItems = getYearSelectItems();

function shortMonth(label: string) {
  return label.slice(0, 3);
}

function shortCurrency(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return formatCurrency(value);
}

export function PayrollMonthlyOverview({
  overview,
  year,
  onYearChange,
  compact = false,
}: PayrollMonthlyOverviewProps) {
  const data = overview ?? [];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const maxNet = Math.max(...data.map((item) => item.net), 1);
  const yearNet = data.reduce((sum, item) => sum + item.net, 0);
  const paidMonths = data.filter((item) => item.status === "paid").length;
  const activeMonths = data.filter((item) => item.net > 0).length;
  const peakIndex = data.reduce(
    (best, item, index) =>
      item.net > (data[best]?.net ?? 0) ? index : best,
    0,
  );

  const chartHeight = compact ? 140 : 168;
  const svgWidth = 100;
  const svgHeight = 56;
  const step = svgWidth / Math.max(data.length - 1, 1);

  const linePoints = useMemo(
    () =>
      data.map((item, index) => {
        const x = data.length === 1 ? svgWidth / 2 : index * step;
        const y = svgHeight - (item.net / maxNet) * svgHeight;
        return { x, y, item, index };
      }),
    [data, maxNet, step],
  );

  const areaPath =
    linePoints.length > 0
      ? `M 0,${svgHeight} L ${linePoints.map((p) => `${p.x},${p.y}`).join(" L ")} L ${svgWidth},${svgHeight} Z`
      : "";
  const linePath = linePoints.map((p) => `${p.x},${p.y}`).join(" L ");

  const activePoint =
    activeIndex != null ? linePoints[activeIndex] : linePoints[peakIndex];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/[0.07] via-card to-violet-500/[0.06] p-5 shadow-sm",
        compact && "p-4",
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Monthly payroll overview</h2>
          <p className="text-xs text-muted-foreground">
            Net payroll trend for {year} · {activeMonths} active months
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {onYearChange ? (
            <div className="min-w-[7rem]">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Chart year
              </p>
              <LabeledSelect
                items={yearItems}
                value={String(year)}
                onValueChange={(value) => {
                  if (!value) return;
                  onYearChange(Number.parseInt(value, 10));
                }}
              />
            </div>
          ) : null}
          <div className="rounded-lg border bg-card/90 px-3 py-2 text-right shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Year net
            </p>
            <p className="text-sm font-semibold tabular-nums">{formatCurrency(yearNet)}</p>
          </div>
        </div>
      </div>

      {activePoint ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border bg-card/70 px-3 py-2 text-xs">
          <span className="font-semibold">{activePoint.item.label}</span>
          <span className="text-muted-foreground">
            Net {formatCurrency(activePoint.item.net)}
          </span>
          <span className="text-muted-foreground">
            Gross {formatCurrency(activePoint.item.gross)}
          </span>
          {activePoint.item.status ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                activePoint.item.status === "paid"
                  ? "bg-emerald-500/15 text-emerald-700"
                  : "bg-primary/10 text-primary",
              )}
            >
              {activePoint.item.status}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="relative rounded-xl border bg-background/40 p-3">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="pointer-events-none absolute inset-x-6 top-6 h-28 w-[calc(100%-3rem)] text-primary/20"
          preserveAspectRatio="none"
          aria-hidden
        >
          {areaPath ? <path d={areaPath} fill="currentColor" /> : null}
          {linePath ? (
            <path
              d={`M ${linePath}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="text-primary/55"
            />
          ) : null}
        </svg>

        <div
          className="relative flex items-end gap-1 px-1 sm:gap-2"
          style={{ height: chartHeight }}
        >
          {data.map((item, index) => {
            const barHeight =
              item.net > 0 ? Math.max(12, (item.net / maxNet) * 100) : 6;
            const isPaid = item.status === "paid";
            const isPeak = index === peakIndex && item.net > 0;
            const isActive = activeIndex === index || (activeIndex == null && isPeak);

            return (
              <button
                key={item.month}
                type="button"
                className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 outline-none"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                aria-label={`${item.label}: ${formatCurrency(item.net)}`}
              >
                <span
                  className={cn(
                    "text-[9px] font-semibold tabular-nums transition-opacity sm:text-[10px]",
                    item.net > 0 ? "text-foreground" : "text-transparent",
                    isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100",
                  )}
                >
                  {item.net > 0 ? shortCurrency(item.net) : "—"}
                </span>
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className={cn(
                      "w-full max-w-9 rounded-t-lg shadow-sm transition-all duration-300",
                      item.net > 0
                        ? isPaid
                          ? "bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-300"
                          : "bg-gradient-to-t from-primary via-primary/85 to-primary/45"
                        : "bg-muted/50",
                      isActive && item.net > 0 && "max-w-10 ring-2 ring-primary/25",
                    )}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
                <span className="w-full truncate text-center text-[10px] font-medium text-muted-foreground">
                  {shortMonth(item.label)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border bg-card/60 px-3 py-2 text-xs">
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            In progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            Paid
          </span>
        </div>
        <span className="font-semibold tabular-nums">Paid months {paidMonths} / 12</span>
      </div>
    </div>
  );
}
