import type { TeamRecruitmentSummary } from "@/types/manager-recruitment";
import { cn } from "@/lib/utils";

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
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

export function ManagerRecruitmentKpis({ summary }: { summary: TeamRecruitmentSummary }) {
  const items = [
    {
      label: "Open Positions",
      value: summary.openPositions,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Candidates Assigned",
      value: summary.candidatesAssigned,
      accent: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Interviews Today",
      value: summary.interviewsToday,
      accent: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Pending Feedback",
      value: summary.pendingFeedback,
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Offers Awaiting Approval",
      value: summary.offersAwaitingApproval,
      accent: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Positions Filled",
      value: summary.positionsFilled,
      accent: "text-violet-600 dark:text-violet-400",
    },
  ] as const;

  return (
    <section
      aria-label="Recruitment summary"
      className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6"
    >
      {items.map((item) => (
        <KpiCard key={item.label} label={item.label} value={item.value} accent={item.accent} />
      ))}
    </section>
  );
}
