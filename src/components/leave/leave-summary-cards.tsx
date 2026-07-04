import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Palmtree,
  Percent,
  XCircle,
} from "lucide-react";

import { LEAVE_SUMMARY_LABELS } from "@/lib/leave/constants";
import type { LeaveSummary } from "@/types/leave";

type LeaveSummaryCardsProps = {
  summary: LeaveSummary;
};

type SummaryCardConfig = {
  key: keyof LeaveSummary;
  icon: typeof Clock3;
  accent: string;
  bg: string;
  format: (value: number) => string;
};

const STATUS_ROW: SummaryCardConfig[] = [
  {
    key: "pendingRequests",
    icon: Clock3,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    format: (value) => String(value),
  },
  {
    key: "approvedThisMonth",
    icon: CheckCircle2,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    format: (value) => String(value),
  },
  {
    key: "rejectedThisMonth",
    icon: XCircle,
    accent: "text-destructive",
    bg: "bg-destructive/10",
    format: (value) => String(value),
  },
];

const WORKFORCE_ROW: SummaryCardConfig[] = [
  {
    key: "employeesOnLeaveToday",
    icon: Palmtree,
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    format: (value) => String(value),
  },
  {
    key: "balanceUtilizationPercent",
    icon: Percent,
    accent: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    format: (value) => `${value}%`,
  },
  {
    key: "upcomingPlannedLeaves",
    icon: CalendarClock,
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    format: (value) => String(value),
  },
];

function SummaryCard({
  item,
  value,
}: {
  item: SummaryCardConfig;
  value: number;
}) {
  const Icon = item.icon;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {LEAVE_SUMMARY_LABELS[item.key]}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {item.format(value)}
          </p>
        </div>
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${item.bg}`}
        >
          <Icon className={`size-4 ${item.accent}`} />
        </div>
      </div>
    </div>
  );
}

export function LeaveSummaryCards({ summary }: LeaveSummaryCardsProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STATUS_ROW.map((item) => (
          <SummaryCard key={item.key} item={item} value={summary[item.key]} />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WORKFORCE_ROW.map((item) => (
          <SummaryCard key={item.key} item={item} value={summary[item.key]} />
        ))}
      </div>
    </div>
  );
}
