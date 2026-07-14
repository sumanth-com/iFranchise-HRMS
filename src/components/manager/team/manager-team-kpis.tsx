import type { TeamSummary } from "@/types/manager-team";
import { cn } from "@/lib/utils";

function KpiCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number;
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

export function ManagerTeamKpis({ summary }: { summary: TeamSummary }) {
  const items = [
    { label: "Total Team Members", value: summary.totalTeamMembers },
    {
      label: "Present Today",
      value: summary.presentToday,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "On Leave Today",
      value: summary.onLeaveToday,
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Probation Employees",
      value: summary.probationEmployees,
      accent: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Upcoming Birthdays (7 Days)",
      value: summary.upcomingBirthdays,
      accent: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Team Completion Rate",
      value: summary.teamCompletionRate,
      suffix: "%",
      accent: "text-indigo-600 dark:text-indigo-400",
    },
  ] as const;

  return (
    <section aria-label="Team summary" className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <KpiCard
          key={item.label}
          label={item.label}
          value={item.value}
          suffix={"suffix" in item ? item.suffix : undefined}
          accent={"accent" in item ? item.accent : undefined}
        />
      ))}
    </section>
  );
}
