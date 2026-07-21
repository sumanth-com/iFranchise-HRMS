import type { GoalProgressItem } from "@/types/performance";
import { cn } from "@/lib/utils";

type GoalCompletionTrendChartProps = {
  items: GoalProgressItem[];
};

function shortMonth(label: string) {
  return label.split(" ")[0]?.slice(0, 3) ?? label;
}

function MonthRing({
  month,
  pct,
  completed,
  total,
  isLatest,
}: {
  month: string;
  pct: number;
  completed: number;
  total: number;
  isLatest: boolean;
}) {
  const size = isLatest ? 72 : 64;
  const stroke = isLatest ? 7 : 6;
  const radius = (size - stroke) / 2 - 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-2",
        isLatest && "scale-105",
      )}
      title={`${month}: ${completed} of ${total} goals completed`}
    >
      <div
        className={cn(
          "relative",
          isLatest && "rounded-full shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]",
        )}
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="stroke-muted"
            strokeWidth={stroke}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#goalTrendRing)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-semibold tabular-nums">{pct}%</span>
          {total > 0 ? (
            <span className="text-[9px] text-muted-foreground">
              {completed}/{total}
            </span>
          ) : null}
        </div>
      </div>
      <span
        className={cn(
          "truncate text-[10px]",
          isLatest ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        {shortMonth(month)}
      </span>
    </div>
  );
}

export function GoalCompletionTrendChart({ items }: GoalCompletionTrendChartProps) {
  const points = items.map((item) => {
    const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
    return { ...item, pct };
  });

  const totalGoals = points.reduce((sum, item) => sum + item.total, 0);
  const totalCompleted = points.reduce((sum, item) => sum + item.completed, 0);
  const averagePct =
    points.length > 0
      ? Math.round(points.reduce((sum, item) => sum + item.pct, 0) / points.length)
      : 0;
  const latest = points.at(-1);

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/8 via-muted/20 to-cyan-500/5 px-3 py-4">
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <linearGradient id="goalTrendRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(160 84% 39%)" />
            <stop offset="100%" stopColor="hsl(187 85% 43%)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums">{averagePct}%</p>
          <p className="text-[11px] text-muted-foreground">6-month average</p>
        </div>
        {latest ? (
          <div className="rounded-full bg-background/80 px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
            Latest: <span className="font-medium text-foreground">{latest.pct}%</span>
            {totalGoals > 0 ? (
              <span>
                {" "}
                · {totalCompleted}/{totalGoals} goals
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-1 sm:gap-2">
        {points.map((item, index) => (
          <MonthRing
            key={item.month}
            month={item.month}
            pct={item.pct}
            completed={item.completed}
            total={item.total}
            isLatest={index === points.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
