import {
  CalendarClock,
  CheckCircle2,
  Palmtree,
  Percent,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { CeoLeaveSummary } from "@/types/ceo-leave";

type SummaryCard = {
  key: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  bg: string;
  format: (value: number) => string;
  highlight?: (value: number) => boolean;
};

const CARDS: SummaryCard[] = [
  {
    key: "employeesOnLeaveToday",
    label: "On Leave Today",
    icon: Palmtree,
    accent: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    format: (value) => String(value),
  },
  {
    key: "upcomingLeaves",
    label: "Upcoming Leaves",
    icon: CalendarClock,
    accent: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
    format: (value) => String(value),
  },
  {
    key: "pendingCeoApprovals",
    label: "Pending CEO Approvals",
    icon: ShieldCheck,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    format: (value) => String(value),
    highlight: (value) => value > 0,
  },
  {
    key: "approvedThisMonth",
    label: "Approved This Month",
    icon: CheckCircle2,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    format: (value) => String(value),
  },
  {
    key: "rejectedThisMonth",
    label: "Rejected This Month",
    icon: XCircle,
    accent: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    format: (value) => String(value),
  },
  {
    key: "leaveUtilization",
    label: "Leave Utilization",
    icon: Percent,
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    format: (value) => `${value}%`,
  },
];

const VALUE_KEY: Record<string, keyof CeoLeaveSummary> = {
  leaveUtilization: "leaveUtilizationPercent",
};

export function CeoLeaveSummaryCards({ summary }: { summary: CeoLeaveSummary }) {
  return (
    <section
      aria-label="Leave summary"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {CARDS.map((card) => {
        const dataKey = (VALUE_KEY[card.key] ?? card.key) as keyof CeoLeaveSummary;
        const value = summary[dataKey];
        const Icon = card.icon;
        const highlighted = card.highlight?.(value) ?? false;
        return (
          <div key={card.key} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs leading-snug text-muted-foreground">
                  {card.label}
                </p>
                <p
                  className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${
                    highlighted ? card.accent : ""
                  }`}
                >
                  {card.format(value)}
                </p>
              </div>
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-full ${card.bg}`}
              >
                <Icon className={`size-4 ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
