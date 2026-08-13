"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { cn } from "@/lib/utils";
import type { RecruitmentOverview, RecruitmentOverviewPoint } from "@/types/recruitment";

type RangeKey = "hours" | "week" | "month";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "hours", label: "24h" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

const HELP_POINTS = [
  {
    label: "What this shows",
    detail:
      "New candidate applications over time, so you can see whether hiring interest is rising or slowing.",
  },
  {
    label: "Peak applications",
    detail: "The highest number of applications in a single day or hour in the selected range.",
  },
  {
    label: "Change vs last period",
    detail:
      "Percent change versus the previous period. If there is nothing to compare against, the card shows the current application count instead of a percentage.",
  },
  {
    label: "Chart",
    detail:
      "Hover a point to see applications on that day or hour. Use 24h, Week, or Month to change the window.",
  },
];

function formatChange(current: number, previous: number) {
  if (previous <= 0) return null;
  const percent = ((current - previous) / previous) * 100;
  const digits = Math.abs(percent) >= 10 ? 0 : 1;
  const sign = percent >= 0 ? "+" : "−";
  return {
    label: `${sign}${Math.abs(percent).toFixed(digits)}%`,
    positive: percent >= 0,
  };
}

function applicationsLabel(count: number) {
  return `${count} application${count === 1 ? "" : "s"}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function chartGeometry(points: RecruitmentOverviewPoint[], width: number, height: number) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((point, index) => {
    const x = index * step;
    const y = clamp(height - (point.value / max) * height, 2, height - 2);
    return { x, y, point };
  });

  if (coords.length === 0) {
    return { line: "", fill: "", coords };
  }

  let line = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i === 0 ? i : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clamp(p1.y + (p2.y - p0.y) / 6, 0, height);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clamp(p2.y - (p3.y - p1.y) / 6, 0, height);
    line += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  const last = coords[coords.length - 1];
  const fill = `${line} L ${last.x.toFixed(1)} ${height} L 0 ${height} Z`;
  return { line, fill, coords };
}

function periodTotals(overview: RecruitmentOverview, range: RangeKey) {
  if (range === "hours") return { current: overview.thisHours, previous: overview.lastHours };
  if (range === "week") return { current: overview.thisWeek, previous: overview.lastWeek };
  return { current: overview.thisMonth, previous: overview.lastMonth };
}

export function RecruitmentOverviewCard({
  overview,
  className,
}: {
  overview: RecruitmentOverview;
  className?: string;
}) {
  const [range, setRange] = useState<RangeKey>("month");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const points = overview[range];
  const totals = periodTotals(overview, range);
  const change = formatChange(totals.current, totals.previous);
  const peak = Math.max(0, ...points.map((point) => point.value));
  const updated = new Date(overview.updatedAt);

  const width = 360;
  const height = 96;
  const chart = useMemo(() => chartGeometry(points, width, height), [points]);
  const activeIndex = hoverIndex;
  const active = activeIndex != null ? chart.coords[activeIndex] : null;
  const previousPoint =
    activeIndex != null && activeIndex > 0 ? points[activeIndex - 1]?.value ?? 0 : 0;
  const pointChange =
    active && previousPoint > 0 ? formatChange(active.point.value, previousPoint) : null;
  const ticks = chart.coords.filter((_, index) => {
    if (points.length <= 4) return true;
    const step = Math.ceil((points.length - 1) / 3);
    return index % step === 0 || index === points.length - 1;
  });

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">Application trend</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 shrink-0 rounded-full border text-muted-foreground hover:text-foreground"
          aria-label="About application trend"
          onClick={() => setHelpOpen(true)}
        >
          <Info className="size-3.5" />
        </Button>
      </div>

      <div className="mt-3 space-y-1.5 text-[11px]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground">Peak applications</span>
          <span className="text-right font-medium tabular-nums text-foreground">
            {applicationsLabel(peak)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground">Change vs last period</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              change
                ? change.positive
                  ? "text-sky-600"
                  : "text-rose-600"
                : "text-muted-foreground",
            )}
          >
            {change?.label ?? "—"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex justify-center">
        <div className="inline-flex rounded-full border bg-muted/40 p-0.5">
          {RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setRange(item.key);
                setHoverIndex(null);
              }}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                range === item.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-3 min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${width} ${height + 18}`}
          className="h-full w-full"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {[0.25, 0.5, 0.75, 1].map((fraction) => (
            <line
              key={`h-${fraction}`}
              x1="0"
              x2={width}
              y1={height * fraction}
              y2={height * fraction}
              stroke="currentColor"
              strokeDasharray="3 4"
              className="text-border"
            />
          ))}
          {ticks.map((tick) => (
            <line
              key={`v-${tick.point.key}`}
              x1={tick.x}
              x2={tick.x}
              y1="0"
              y2={height}
              stroke="currentColor"
              strokeDasharray="3 4"
              className="text-border"
            />
          ))}
          {chart.fill ? <path d={chart.fill} fill="url(#recruitmentOverviewFillLight)" /> : null}
          {chart.line ? (
            <path d={chart.line} fill="none" stroke="#0ea5e9" strokeWidth="2.4" strokeLinecap="round" />
          ) : null}
          {chart.coords.map((coord, index) => (
            <rect
              key={coord.point.key}
              x={Math.max(0, coord.x - width / (points.length * 2))}
              y="0"
              width={width / Math.max(points.length, 1)}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(index)}
            />
          ))}
          {active ? (
            <>
              <line
                x1={active.x}
                x2={active.x}
                y1="0"
                y2={height}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
              <circle cx={active.x} cy={active.y} r="4.5" fill="#fff" stroke="#0ea5e9" strokeWidth="2.25" />
            </>
          ) : null}
          {ticks.map((tick) => (
            <text
              key={`tick-${tick.point.key}`}
              x={tick.x}
              y={height + 14}
              textAnchor={tick.x < 16 ? "start" : tick.x > width - 16 ? "end" : "middle"}
              className="fill-muted-foreground text-[8px]"
            >
              {tick.point.label}
            </text>
          ))}
          <defs>
            <linearGradient id="recruitmentOverviewFillLight" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {active ? (
          <div
            className="pointer-events-none absolute top-1 z-10 min-w-[7.5rem] rounded-xl border bg-card px-2.5 py-2 shadow-lg"
            style={{
              left: `${clamp((active.x / width) * 100 - 16, 2, 62)}%`,
            }}
          >
            <p className="text-[11px] text-muted-foreground">{active.point.label}</p>
            <p className="text-sm font-semibold tabular-nums">
              {applicationsLabel(active.point.value)}
            </p>
            {pointChange ? (
              <p
                className={cn(
                  "text-[11px] font-medium tabular-nums",
                  pointChange.positive ? "text-sky-600" : "text-rose-600",
                )}
              >
                {pointChange.label}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p
          className={cn(
            "text-xl font-semibold tabular-nums",
            change ? (change.positive ? "text-sky-600" : "text-rose-600") : "text-foreground",
          )}
        >
          {change?.label ?? applicationsLabel(totals.current)}
        </p>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Last updated</p>
          <p className="text-[11px] font-medium">
            Today,{" "}
            {updated.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
        </div>
      </div>

      <Modal
        open={helpOpen}
        onOpenChange={setHelpOpen}
        title="Application trend"
        description="How to read this hiring applications card."
        showCancel={false}
        footer={
          <Button type="button" onClick={() => setHelpOpen(false)}>
            Got it
          </Button>
        }
      >
        <div className="space-y-4">
          {HELP_POINTS.map((point) => (
            <div key={point.label} className="space-y-1">
              <p className="text-sm font-medium">{point.label}</p>
              <p className="text-sm text-muted-foreground">{point.detail}</p>
            </div>
          ))}
        </div>
      </Modal>
    </section>
  );
}
