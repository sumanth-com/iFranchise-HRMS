import type { TeamPerformanceSummary } from "@/types/manager-performance";
import { cn } from "@/lib/utils";

function KpiCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  accent?: string;
}) {
  return (
    <div className="flex min-h-[4.5rem] flex-col justify-between rounded-xl border bg-card px-3 py-2.5 shadow-sm">
      <p className="line-clamp-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("text-xl font-semibold tracking-tight tabular-nums", accent)}>
        {value}
        {suffix ? <span className="text-sm font-medium">{suffix}</span> : null}
      </p>
    </div>
  );
}

export function ManagerPerformanceKpis({ summary }: { summary: TeamPerformanceSummary }) {
  const items = [
    {
      label: "Team Average Rating",
      value: summary.teamAverageRating.toFixed(1),
      accent: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Reviews Pending",
      value: summary.reviewsPending,
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Reviews Completed",
      value: summary.reviewsCompleted,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Goals At Risk",
      value: summary.goalsAtRisk,
      accent: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "High Performers",
      value: summary.highPerformers,
      accent: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Needing Attention",
      value: summary.employeesNeedingAttention,
      accent: "text-rose-600 dark:text-rose-400",
    },
  ] as const;

  return (
    <section
      aria-label="Performance summary"
      className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6"
    >
      {items.map((item) => (
        <KpiCard
          key={item.label}
          label={item.label}
          value={item.value}
          accent={item.accent}
        />
      ))}
    </section>
  );
}
