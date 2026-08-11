"use client";

import { useState } from "react";

import { LabeledSelect } from "@/components/payroll/payroll-select";
import type { SelectItemOption } from "@/components/payroll/select-utils";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import { cn } from "@/lib/utils";
import type { PayrollSummary } from "@/types/payroll";

type PayrollMonthlyOverviewProps = {
  overview: PayrollSummary["monthlyOverview"];
  year: number;
  month?: number;
  periodLabel?: string;
  monthItems?: SelectItemOption[];
  yearItems?: SelectItemOption[];
  onPeriodChange?: (month: number, year: number) => void;
  onYearChange?: (year: number) => void;
  compact?: boolean;
  dashboard?: boolean;
};

const BAR_WIDTH = 28;
const CHART_HEIGHT = 200;
const DASHBOARD_CHART_HEIGHT = 280;
const filterSelectClass = "h-9 w-full";

function shortMonth(label: string) {
  return label.slice(0, 3);
}

export function PayrollMonthlyOverview({
  overview,
  year,
  month,
  periodLabel,
  monthItems,
  yearItems,
  onPeriodChange,
  onYearChange,
  compact = false,
  dashboard = false,
}: PayrollMonthlyOverviewProps) {
  const data = overview ?? [];

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const hoverPoint = hoverIndex != null ? data[hoverIndex] : null;

  const maxNet = Math.max(...data.map((item) => item.net), 1);
  const paidMonths = data.filter((item) => item.status === "paid").length;
  const activeMonths = data.filter((item) => item.net > 0).length;

  const gridLines = [0, 25, 50, 75, 100];
  const showPeriodFilters =
    month != null &&
    periodLabel &&
    monthItems &&
    yearItems &&
    onPeriodChange;

  const chartHeight = dashboard ? DASHBOARD_CHART_HEIGHT : CHART_HEIGHT;

  return (
    <section
      className={cn(
        "rounded-xl border bg-card shadow-sm",
        dashboard ? "flex min-h-0 flex-1 flex-col p-4" : compact ? "p-4" : "p-5",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Monthly payroll overview</h2>
          <p className="text-xs text-muted-foreground">
            Net and gross payroll by month for {year}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showPeriodFilters ? (
            <>
              <div className="w-32">
                <LabeledSelect
                  items={monthItems}
                  value={String(month)}
                  triggerClassName={filterSelectClass}
                  onValueChange={(value) => {
                    if (!value) return;
                    onPeriodChange(Number.parseInt(value, 10), year);
                  }}
                />
              </div>
              <div className="w-24">
                <LabeledSelect
                  items={yearItems}
                  value={String(year)}
                  triggerClassName={filterSelectClass}
                  onValueChange={(value) => {
                    if (!value) return;
                    onPeriodChange(month, Number.parseInt(value, 10));
                  }}
                />
              </div>
            </>
          ) : null}

          {onYearChange && !showPeriodFilters ? (
            <div className="w-28">
              <LabeledSelect
                items={yearItems ?? []}
                value={String(year)}
                triggerClassName={filterSelectClass}
                onValueChange={(value) => {
                  if (!value) return;
                  onYearChange(Number.parseInt(value, 10));
                }}
              />
            </div>
          ) : null}

          {periodLabel ? (
            <span
              className="inline-flex h-9 shrink-0 items-center rounded-lg border border-input bg-muted/40 px-3 text-sm font-medium text-foreground shadow-sm"
            >
              Viewing {periodLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "relative rounded-lg border bg-background/60 px-3 py-3",
          dashboard && "min-h-0 flex-1",
        )}
      >
        {hoverPoint ? (
          <div
            className="pointer-events-none absolute top-2 z-20 w-[min(100%,18rem)] -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
            style={{
              left: `${(((hoverIndex ?? 0) + 0.5) / Math.max(data.length, 1)) * 100}%`,
            }}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-foreground">{hoverPoint.label}</span>
              <span className="text-muted-foreground tabular-nums">
                Net {formatCurrency(hoverPoint.net)}
              </span>
              <span className="text-muted-foreground tabular-nums">
                Gross {formatCurrency(hoverPoint.gross)}
              </span>
              <span className="text-muted-foreground tabular-nums">
                Ded. {formatCurrency(Math.max(0, hoverPoint.gross - hoverPoint.net))}
              </span>
              {hoverPoint.status ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                    hoverPoint.status === "paid"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {hoverPoint.status}
                </span>
              ) : (
                <span className="text-muted-foreground">No run</span>
              )}
            </div>
          </div>
        ) : null}

        <div className="relative" style={{ height: chartHeight }}>
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-1">
            {gridLines.slice(1).map((line) => (
              <div key={line} className="border-t border-dashed border-border/60" />
            ))}
          </div>

          <div className="relative flex h-full items-end justify-between gap-1">
            {data.map((item, index) => {
              const netHeight =
                item.net > 0 ? Math.max(8, (item.net / maxNet) * 100) : 0;
              const grossHeight =
                item.gross > 0 ? Math.max(8, (item.gross / maxNet) * 100) : 0;
              const isPaid = item.status === "paid";
              const isHovered = hoverIndex === index;
              const hasData = item.net > 0 || item.gross > 0;

              return (
                <div
                  key={item.month}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                >
                  <button
                    type="button"
                    className="flex h-full w-full max-w-[2.25rem] flex-col items-center justify-end outline-none sm:max-w-none"
                    style={{ width: BAR_WIDTH }}
                    onMouseEnter={() => setHoverIndex(index)}
                    onMouseLeave={() => setHoverIndex(null)}
                    onFocus={() => setHoverIndex(index)}
                    onBlur={() => setHoverIndex(null)}
                    onClick={() => {
                      if (onPeriodChange) {
                        onPeriodChange(index + 1, year);
                      }
                    }}
                    aria-label={`${item.label}: net ${formatCurrency(item.net)}`}
                  >
                    <div className="relative flex h-[calc(100%-1.25rem)] w-full items-end justify-center">
                      {hasData ? (
                        <div className="relative flex h-full w-full items-end justify-center gap-0.5">
                          <div
                            className={cn(
                              "w-[38%] rounded-t-sm bg-muted/70",
                              isHovered ? "opacity-90" : "opacity-45",
                            )}
                            style={{ height: `${grossHeight}%` }}
                            aria-hidden
                          />
                          <div
                            className={cn(
                              "w-[38%] rounded-t-sm",
                              item.net > 0
                                ? isPaid
                                  ? "bg-emerald-500"
                                  : "bg-primary"
                                : "bg-muted/50",
                              isHovered ? "opacity-100" : "opacity-70",
                            )}
                            style={{ height: `${netHeight}%` }}
                            aria-hidden
                          />
                        </div>
                      ) : (
                        <div className="h-1 w-full rounded-full bg-muted/40" aria-hidden />
                      )}
                    </div>
                    <span className="mt-1 w-full truncate text-center text-[10px] font-medium text-muted-foreground">
                      {shortMonth(item.label)}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-muted/70" />
            Gross
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary" />
            Net (in progress)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-emerald-500" />
            Net (paid)
          </span>
        </div>
        <span className="font-medium tabular-nums">
          {paidMonths} paid · {activeMonths} active months
        </span>
      </div>
    </section>
  );
}
