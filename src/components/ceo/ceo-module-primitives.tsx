import Link from "next/link";

import { BarRow } from "@/components/reports/report-chart-cards";
import { formatCurrencyInr } from "@/lib/reports/services/reports-utils";
import type { CeoChartItem } from "@/types/ceo-dashboard";
import { cn } from "@/lib/utils";

export function CeoModulePageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function CeoStatCard({
  label,
  value,
  accent,
  valueClassName,
  wrapValue,
}: {
  label: string;
  value: string;
  accent?: string;
  valueClassName?: string;
  wrapValue?: boolean;
}) {
  return (
    <div className="flex h-full min-h-[4.25rem] w-full min-w-0 flex-col justify-between gap-1.5 rounded-xl border bg-card px-3.5 py-3 shadow-sm">
      <p className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "font-semibold tracking-tight",
          wrapValue
            ? "text-sm leading-snug break-words"
            : "truncate text-2xl leading-none tabular-nums",
          accent,
          valueClassName,
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

const CHART_THEMES: Record<
  string,
  { bar: string; shell: string; area: string; stroke: string }
> = {
  "bg-primary": {
    bar: "bg-gradient-to-t from-zinc-800 to-zinc-500 dark:from-zinc-200 dark:to-zinc-400",
    shell: "bg-gradient-to-br from-zinc-500/8 via-card to-card",
    area: "text-zinc-500/15",
    stroke: "text-zinc-500/40",
  },
  "bg-sky-500": {
    bar: "bg-gradient-to-t from-sky-600 to-cyan-400",
    shell: "bg-gradient-to-br from-sky-500/10 via-card to-card",
    area: "text-sky-500/20",
    stroke: "text-sky-500/45",
  },
  "bg-indigo-500": {
    bar: "bg-gradient-to-t from-indigo-600 to-indigo-400",
    shell: "bg-gradient-to-br from-indigo-500/10 via-card to-card",
    area: "text-indigo-500/20",
    stroke: "text-indigo-500/45",
  },
  "bg-violet-500": {
    bar: "bg-gradient-to-t from-violet-600 to-violet-400",
    shell: "bg-gradient-to-br from-violet-500/10 via-card to-card",
    area: "text-violet-500/20",
    stroke: "text-violet-500/45",
  },
  "bg-emerald-500": {
    bar: "bg-gradient-to-t from-emerald-600 to-teal-400",
    shell: "bg-gradient-to-br from-emerald-500/10 via-card to-card",
    area: "text-emerald-500/20",
    stroke: "text-emerald-500/45",
  },
  "bg-rose-500": {
    bar: "bg-gradient-to-t from-rose-600 to-rose-400",
    shell: "bg-gradient-to-br from-rose-500/10 via-card to-card",
    area: "text-rose-500/20",
    stroke: "text-rose-500/45",
  },
  "bg-amber-500": {
    bar: "bg-gradient-to-t from-amber-600 to-amber-400",
    shell: "bg-gradient-to-br from-amber-500/10 via-card to-card",
    area: "text-amber-500/20",
    stroke: "text-amber-500/45",
  },
  "bg-teal-500": {
    bar: "bg-gradient-to-t from-teal-600 to-teal-400",
    shell: "bg-gradient-to-br from-teal-500/10 via-card to-card",
    area: "text-teal-500/20",
    stroke: "text-teal-500/45",
  },
  "bg-fuchsia-500": {
    bar: "bg-gradient-to-t from-fuchsia-600 to-fuchsia-400",
    shell: "bg-gradient-to-br from-fuchsia-500/10 via-card to-card",
    area: "text-fuchsia-500/20",
    stroke: "text-fuchsia-500/45",
  },
  "bg-cyan-500": {
    bar: "bg-gradient-to-t from-cyan-600 to-cyan-400",
    shell: "bg-gradient-to-br from-cyan-500/10 via-card to-card",
    area: "text-cyan-500/20",
    stroke: "text-cyan-500/45",
  },
  "bg-orange-500": {
    bar: "bg-gradient-to-t from-orange-600 to-orange-400",
    shell: "bg-gradient-to-br from-orange-500/10 via-card to-card",
    area: "text-orange-500/20",
    stroke: "text-orange-500/45",
  },
};

function chartTheme(color: string) {
  return (
    CHART_THEMES[color] ?? {
      bar: color.includes("gradient")
        ? color
        : "bg-gradient-to-t from-zinc-800 to-zinc-500",
      shell: "bg-gradient-to-br from-muted/40 via-card to-card",
      area: "text-muted-foreground/15",
      stroke: "text-muted-foreground/40",
    }
  );
}

function shortChartLabel(label: string) {
  const parts = label.trim().split(/\s+/);
  if (parts.length >= 2 && /^\d{4}$/.test(parts[1] ?? "")) {
    return parts[0]?.slice(0, 3) ?? label;
  }
  if (label.length <= 10) return label;
  return `${label.slice(0, 9)}…`;
}

export function CeoChartPanel({
  title,
  items,
  color = "bg-primary",
  formatValue,
  variant = "columns",
}: {
  title: string;
  items: CeoChartItem[];
  color?: string;
  formatValue?: (value: number) => string;
  variant?: "columns" | "rows";
}) {
  const displayItems = items.filter((item) => item.value !== 0).slice(0, 8);
  if (displayItems.length === 0) return null;

  const max = Math.max(1, ...displayItems.map((item) => item.value));
  const format = formatValue ?? ((value: number) => String(value));
  const theme = chartTheme(color);

  if (variant === "rows") {
    return (
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">{title}</h2>
        <div className="space-y-2.5">
          {displayItems.map((item) => (
            <BarRow
              key={item.label}
              label={item.label}
              value={item.value}
              max={max}
              color={color}
              formatValue={format}
            />
          ))}
        </div>
      </section>
    );
  }

  const width = 100;
  const height = 56;
  const step = width / Math.max(displayItems.length - 1, 1);
  const areaPoints = displayItems.map((item, index) => {
    const x = displayItems.length === 1 ? width / 2 : index * step;
    const y = height - (item.value / max) * height;
    return `${x},${y}`;
  });
  const areaPath = `M 0,${height} L ${areaPoints.join(" L ")} L ${width},${height} Z`;
  const linePath = areaPoints.join(" L ");

  return (
    <section className={cn("relative overflow-hidden rounded-xl border p-4 shadow-sm", theme.shell)}>
      <h2 className="mb-3 text-sm font-semibold tracking-tight">{title}</h2>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={cn(
            "pointer-events-none absolute inset-x-2 bottom-9 h-28 w-[calc(100%-1rem)]",
            theme.area,
          )}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={areaPath} fill="currentColor" />
          <path
            d={`M ${linePath}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className={theme.stroke}
          />
        </svg>

        <div className="relative flex h-40 items-end gap-2 px-1">
          {displayItems.map((item) => {
            const barHeight = Math.max(10, (item.value / max) * 100);
            return (
              <div
                key={item.label}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              >
                <span className="text-[10px] font-semibold tabular-nums text-foreground">
                  {format(item.value)}
                </span>
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className={cn(
                      "w-full max-w-10 rounded-t-lg shadow-sm transition-all",
                      theme.bar,
                    )}
                    style={{ height: `${barHeight}%` }}
                    title={`${item.label}: ${format(item.value)}`}
                  />
                </div>
                <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                  {shortChartLabel(item.label)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CeoBackToDashboard() {
  return (
    <Link href="/ceo" className="text-xs font-medium text-primary hover:underline">
      ← Back to Executive Dashboard
    </Link>
  );
}

export function formatCeoCurrency(value: number) {
  return formatCurrencyInr(value);
}

export function formatCeoPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}
