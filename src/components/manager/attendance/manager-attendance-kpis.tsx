import type { TeamAttendanceSummary } from "@/types/manager-attendance";
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

export function ManagerAttendanceKpis({ summary }: { summary: TeamAttendanceSummary }) {
  const items = [
    {
      label: "Present Today",
      value: summary.presentToday,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Absent Today",
      value: summary.absentToday,
      accent: "text-rose-600 dark:text-rose-400",
    },
    {
      label: "Late Arrivals",
      value: summary.lateToday,
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Half Day",
      value: summary.halfDayToday,
      accent: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Work From Home",
      value: summary.workFromHomeToday,
      accent: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Pending Regularizations",
      value: summary.pendingRegularizations,
      accent: "text-indigo-600 dark:text-indigo-400",
    },
  ] as const;

  return (
    <section
      aria-label="Attendance summary"
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
