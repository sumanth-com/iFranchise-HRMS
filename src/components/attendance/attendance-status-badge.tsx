import { cn } from "@/lib/utils";
import { ATTENDANCE_DISPLAY_STATUS_LABELS } from "@/lib/attendance/constants";
import type { AttendanceDisplayStatus } from "@/types/attendance";

const STATUS_STYLES: Record<AttendanceDisplayStatus, string> = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  absent: "bg-red-500/15 text-red-700 dark:text-red-400",
  late: "bg-orange-400/15 text-orange-700 dark:text-orange-300",
  half_day: "bg-emerald-200/80 text-emerald-800 dark:text-emerald-300",
  on_leave: "bg-violet-400/15 text-violet-700 dark:text-violet-300",
  holiday: "bg-sky-400/15 text-sky-700 dark:text-sky-300",
  week_off: "bg-muted text-muted-foreground",
  upcoming: "bg-muted text-muted-foreground",
  on_request: "bg-amber-400/15 text-amber-800 dark:text-amber-300",
};

type AttendanceStatusBadgeProps = {
  status: AttendanceDisplayStatus;
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
      {ATTENDANCE_DISPLAY_STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** History rows: upcoming working days have no status yet — show a dash. */
export function AttendanceHistoryStatusCell({
  status,
  className,
}: AttendanceStatusBadgeProps) {
  if (status === "upcoming") {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  return <AttendanceStatusBadge status={status} className={className} />;
}
