import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

import { LEAVE_SUMMARY_LABELS } from "@/lib/leave/constants";
import type { LeaveSummary } from "@/types/leave";
import { cn } from "@/lib/utils";

export type LeaveSummaryFilterKey =
  | "pendingRequests"
  | "approvedThisMonth"
  | "rejectedThisMonth"
  | "upcomingPlannedLeaves";

type LeaveSummaryCardsProps = {
  summary: LeaveSummary;
  activeKey?: LeaveSummaryFilterKey;
  onSelect?: (key: LeaveSummaryFilterKey) => void;
  disabled?: boolean;
};

const SUMMARY_CONFIG = [
  {
    key: "pendingRequests" as const,
    icon: Clock3,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    ring: "hover:border-amber-500/40 data-[active=true]:border-amber-500 data-[active=true]:bg-amber-500/10",
  },
  {
    key: "approvedThisMonth" as const,
    icon: CheckCircle2,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "hover:border-emerald-500/40 data-[active=true]:border-emerald-500 data-[active=true]:bg-emerald-500/10",
  },
  {
    key: "rejectedThisMonth" as const,
    icon: XCircle,
    accent: "text-destructive",
    bg: "bg-destructive/10",
    ring: "hover:border-destructive/40 data-[active=true]:border-destructive data-[active=true]:bg-destructive/10",
  },
  {
    key: "upcomingPlannedLeaves" as const,
    icon: CalendarClock,
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    ring: "hover:border-violet-500/40 data-[active=true]:border-violet-500 data-[active=true]:bg-violet-500/10",
  },
];

export function LeaveSummaryCards({
  summary,
  activeKey,
  onSelect,
  disabled = false,
}: LeaveSummaryCardsProps) {
  const clickable = Boolean(onSelect);

  return (
    <div className="grid grid-cols-4 items-stretch gap-3">
      {SUMMARY_CONFIG.map((item) => {
        const Icon = item.icon;
        const isActive = activeKey === item.key;
        const className = cn(
          "h-full min-w-0 rounded-xl border bg-card px-3 py-3.5 text-left shadow-sm transition-colors",
          clickable &&
            "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60",
          clickable && item.ring,
        );

        const content = (
          <div className="flex h-full items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="overflow-visible text-sm leading-snug font-medium break-normal hyphens-none text-muted-foreground">
                {LEAVE_SUMMARY_LABELS[item.key]}
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
                {summary[item.key]}
              </p>
            </div>
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${item.bg}`}
            >
              <Icon className={`size-4 ${item.accent}`} />
            </div>
          </div>
        );

        if (!clickable) {
          return (
            <div key={item.key} className={className}>
              {content}
            </div>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            className={className}
            data-active={isActive ? "true" : "false"}
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onSelect?.(item.key)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
