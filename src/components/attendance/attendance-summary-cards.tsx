import {
  Clock3,
  Coffee,
  Palmtree,
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
    key: "onLeaveToday" as const,
    icon: Palmtree,
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {SUMMARY_CONFIG.map((item) => {
          const Icon = item.icon;
          const value = summary[item.key];

          return (
            <div
              key={item.key}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {ATTENDANCE_SUMMARY_LABELS[item.key]}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    {value}
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
        })}
    </div>
  );
}
