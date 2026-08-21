import { cn } from "@/lib/utils";
import { ATTENDANCE_DISPLAY_STATUS_LABELS } from "@/lib/attendance/constants";
import type { AttendanceDisplayStatus } from "@/types/attendance";

/** Dark-friendly pills: tinted fill + high-contrast label (no light-on-light). */
const STATUS_STYLES: Record<AttendanceDisplayStatus, string> = {
  present:
    "bg-emerald-500/15 text-emerald-800 ring-1 ring-inset ring-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/35",
  absent:
    "bg-red-500/15 text-red-800 ring-1 ring-inset ring-red-500/25 dark:bg-red-500/20 dark:text-red-200 dark:ring-red-400/35",
  late:
    "bg-orange-500/15 text-orange-800 ring-1 ring-inset ring-orange-500/25 dark:bg-orange-500/20 dark:text-orange-200 dark:ring-orange-400/35",
  half_day:
    "bg-teal-500/15 text-teal-800 ring-1 ring-inset ring-teal-500/25 dark:bg-teal-500/20 dark:text-teal-200 dark:ring-teal-400/35",
  on_leave:
    "bg-violet-500/15 text-violet-800 ring-1 ring-inset ring-violet-500/25 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-400/35",
  holiday:
    "bg-sky-500/15 text-sky-800 ring-1 ring-inset ring-sky-500/25 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-400/35",
  week_off:
    "bg-slate-500/15 text-slate-700 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-400/15 dark:text-slate-100 dark:ring-slate-300/25",
  upcoming:
    "bg-slate-500/10 text-slate-600 ring-1 ring-inset ring-slate-500/15 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
  on_request:
    "bg-amber-500/15 text-amber-900 ring-1 ring-inset ring-amber-500/25 dark:bg-amber-500/20 dark:text-amber-100 dark:ring-amber-400/35",
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
        "inline-flex max-w-full items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
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
