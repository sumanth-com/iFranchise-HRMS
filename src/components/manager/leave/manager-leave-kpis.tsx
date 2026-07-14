import type { TeamLeaveSummary } from "@/types/manager-leave";
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
    <div className="flex min-h-[4.5rem] flex-col justify-between rounded-xl border bg-card px-3 py-2.5 shadow-sm">
      <p className="line-clamp-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("text-xl font-semibold tracking-tight tabular-nums", accent)}>
        {value}
      </p>
    </div>
  );
}

export function ManagerLeaveKpis({ summary }: { summary: TeamLeaveSummary }) {
  const items = [
    {
      label: "Pending Leave Requests",
      value: summary.pendingRequests,
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Approved This Month",
      value: summary.approvedThisMonth,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Rejected This Month",
      value: summary.rejectedThisMonth,
      accent: "text-rose-600 dark:text-rose-400",
    },
    {
      label: "Employees On Leave",
      value: summary.employeesOnLeaveToday,
      accent: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Upcoming Planned Leaves",
      value: summary.upcomingPlannedLeaves,
      accent: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Leave Conflicts",
      value: summary.leaveConflicts,
      accent: "text-orange-600 dark:text-orange-400",
    },
  ] as const;

  return (
    <section
      aria-label="Leave summary"
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
