import {
  Clock3,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";

import { ATTENDANCE_SUMMARY_LABELS } from "@/lib/attendance/constants";
import type { AttendanceStatus, AttendanceSummary } from "@/types/attendance";
import { cn } from "@/lib/utils";

type SummaryCardKey = keyof typeof ATTENDANCE_SUMMARY_LABELS;

type AttendanceSummaryCardsProps = {
  summary: AttendanceSummary;
  activeStatus?: string;
  onSelect?: (status: AttendanceStatus | undefined) => void;
  disabled?: boolean;
};

const SUMMARY_CONFIG = [
  {
    key: "presentToday" as const,
    status: "present" as const,
    icon: UserCheck,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "hover:border-emerald-500/40 data-[active=true]:border-emerald-500 data-[active=true]:bg-emerald-500/10",
  },
  {
    key: "absentToday" as const,
    status: "absent" as const,
    icon: UserMinus,
    accent: "text-destructive",
    bg: "bg-destructive/10",
    ring: "hover:border-destructive/40 data-[active=true]:border-destructive data-[active=true]:bg-destructive/10",
  },
  {
    key: "lateToday" as const,
    status: "late" as const,
    icon: Clock3,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    ring: "hover:border-amber-500/40 data-[active=true]:border-amber-500 data-[active=true]:bg-amber-500/10",
  },
  {
    key: "totalEmployees" as const,
    status: undefined,
    icon: Users,
    accent: "text-foreground",
    bg: "bg-violet-500/10",
    ring: "hover:border-violet-500/40 data-[active=true]:border-violet-500 data-[active=true]:bg-violet-500/10",
  },
] satisfies Array<{
  key: SummaryCardKey;
  status: AttendanceStatus | undefined;
  icon: typeof Users;
  accent: string;
  bg: string;
  ring: string;
}>;

export function AttendanceSummaryCards({
  summary,
  activeStatus,
  onSelect,
  disabled = false,
}: AttendanceSummaryCardsProps) {
  const clickable = Boolean(onSelect);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SUMMARY_CONFIG.map((item) => {
        const Icon = item.icon;
        const value = summary[item.key];
        const isActive = Boolean(item.status) && activeStatus === item.status;

        const className = cn(
          "min-w-0 rounded-xl border bg-card p-3.5 text-left shadow-sm transition-colors",
          clickable &&
            "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60",
          clickable && item.ring,
        );

        const content = (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                {ATTENDANCE_SUMMARY_LABELS[item.key]}
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
                {value}
              </p>
            </div>
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${item.bg}`}
            >
              <Icon className={`size-4 ${item.accent}`} />
            </div>
          </div>
        );

        if (!clickable || item.key === "totalEmployees") {
          return (
            <div key={item.key} className="min-w-0 rounded-xl border bg-card p-3.5 text-left shadow-sm">
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
            onClick={() => onSelect?.(item.status)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
