import {
  Clock3,
  Coffee,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";

import { ATTENDANCE_SUMMARY_LABELS } from "@/lib/attendance/constants";
import type { AttendanceSummary } from "@/types/attendance";

type AttendanceSummaryCardsProps = {
  summary: AttendanceSummary;
};

const SUMMARY_CONFIG = [
  {
    key: "presentToday" as const,
    icon: UserCheck,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    key: "absentToday" as const,
    icon: UserMinus,
    accent: "text-destructive",
    bg: "bg-destructive/10",
  },
  {
    key: "lateToday" as const,
    icon: Clock3,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    key: "halfDayToday" as const,
    icon: Coffee,
    accent: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    key: "totalEmployees" as const,
    icon: Users,
    accent: "text-foreground",
    bg: "bg-muted",
  },
];

export function AttendanceSummaryCards({ summary }: AttendanceSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {SUMMARY_CONFIG.map((item) => {
        const Icon = item.icon;
        const value = summary[item.key];

        return (
          <div
            key={item.key}
            className="min-w-0 rounded-xl border bg-card p-3.5 shadow-sm"
          >
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
          </div>
        );
      })}
    </div>
  );
}
