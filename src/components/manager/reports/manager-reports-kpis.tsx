import type { ManagerReportsSummary } from "@/types/manager-reports";
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

export function ManagerReportsKpis({ summary }: { summary: ManagerReportsSummary }) {
  const items = [
    {
      label: "Team Headcount",
      value: summary.teamHeadcount,
      accent: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Average Attendance",
      value: summary.averageAttendancePercent,
      suffix: "%",
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Leave Utilization",
      value: summary.leaveUtilizationPercent,
      suffix: "%",
      accent: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Performance Score",
      value: summary.performanceScore.toFixed(1),
      accent: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Open Recruitment",
      value: summary.openRecruitment,
      accent: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Attrition Risk",
      value: summary.attritionRisk,
      accent: "text-rose-600 dark:text-rose-400",
    },
  ] as const;

  return (
    <section
      aria-label="Reports summary"
      className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6"
    >
      {items.map((item) => (
        <KpiCard
          key={item.label}
          label={item.label}
          value={item.value}
          suffix={"suffix" in item ? item.suffix : undefined}
          accent={item.accent}
        />
      ))}
    </section>
  );
}
