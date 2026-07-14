import type { ManagerDashboardKpis } from "@/types/manager-dashboard";
import { cn } from "@/lib/utils";

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="flex min-h-[5.5rem] flex-col justify-between rounded-xl border bg-card px-4 py-3.5 shadow-sm transition-colors hover:border-primary/20 hover:bg-primary/[0.02]">
      <p className="line-clamp-2 text-[10px] leading-snug font-medium tracking-wide text-muted-foreground uppercase lg:text-[11px]">
        {label}
      </p>
      <p className={cn("text-2xl font-semibold tracking-tight tabular-nums lg:text-3xl", accent)}>
        {value}
      </p>
    </div>
  );
}

export function ManagerDashboardKpis({ kpis }: { kpis: ManagerDashboardKpis }) {
  const items = [
    { label: "Team Size", value: kpis.teamSize },
    {
      label: "Present Today",
      value: kpis.presentToday,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "On Leave Today",
      value: kpis.onLeaveToday,
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Late Today",
      value: kpis.lateToday,
      accent: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Pending Leave Approvals",
      value: kpis.pendingLeaveApprovals,
      accent: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Pending Performance Reviews",
      value: kpis.pendingPerformanceReviews,
      accent: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Open Recruitment Requests",
      value: kpis.openRecruitmentRequests,
      accent: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Probation Ending (30 days)",
      value: kpis.probationEndingSoon,
      accent: "text-rose-600 dark:text-rose-400",
    },
  ] as const;

  return (
    <section aria-label="Team KPIs" className="shrink-0">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        {items.map((item) => (
          <KpiCard
            key={item.label}
            label={item.label}
            value={item.value}
            accent={"accent" in item ? item.accent : undefined}
          />
        ))}
      </div>
    </section>
  );
}
