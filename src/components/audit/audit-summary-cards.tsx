import { Activity, AlertTriangle, LogIn, ShieldAlert } from "lucide-react";

import type { AuditDashboardStats } from "@/types/audit";
import { cn } from "@/lib/utils";

const CARDS = [
  {
    key: "totalToday" as const,
    label: "Activities Today",
    icon: Activity,
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    key: "criticalActions" as const,
    label: "Critical Actions",
    icon: ShieldAlert,
    accent: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
  },
  {
    key: "failedActions" as const,
    label: "Failed Actions",
    icon: AlertTriangle,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    key: "loginEvents" as const,
    label: "Login Events",
    icon: LogIn,
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
  },
];

export function AuditSummaryCards({ stats }: { stats: AuditDashboardStats }) {
  return (
    <section
      aria-label="Audit summary"
      className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4"
    >
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-sm"
          >
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {card.label}
              </p>
              <p className={cn("mt-0.5 text-2xl font-semibold tabular-nums tracking-tight", card.accent)}>
                {stats[card.key]}
              </p>
            </div>
            <div className={cn("shrink-0 rounded-lg p-2", card.bg)}>
              <Icon className={cn("size-4", card.accent)} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
