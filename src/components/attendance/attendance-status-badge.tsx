import { cn } from "@/lib/utils";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/attendance/constants";
import type { AttendanceStatus } from "@/types/attendance";

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  absent: "bg-destructive/10 text-destructive",
  late: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  half_day: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  on_leave: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  holiday: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  week_off: "bg-muted text-muted-foreground",
};

type AttendanceStatusBadgeProps = {
  status: AttendanceStatus;
  className?: string;
};

export function AttendanceStatusBadge({
  status,
  className,
}: AttendanceStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {ATTENDANCE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
