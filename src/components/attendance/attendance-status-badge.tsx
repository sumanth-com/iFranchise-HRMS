import { cn } from "@/lib/utils";
import {
  resolveAttendanceUiDisplay,
  type AttendanceUiDisplayStatus,
} from "@/lib/attendance/manual-status";
import type { AttendanceDisplayStatus } from "@/types/attendance";

/** Dark-friendly pills: tinted fill + high-contrast label (no light-on-light). */
const STATUS_STYLES: Record<AttendanceUiDisplayStatus | "upcoming" | "on_request", string> = {
  present:
    "bg-emerald-500/15 text-emerald-800 ring-1 ring-inset ring-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/35",
  absent:
    "bg-red-500/15 text-red-800 ring-1 ring-inset ring-red-500/25 dark:bg-red-500/20 dark:text-red-200 dark:ring-red-400/35",
  casual_leave:
    "bg-violet-500/15 text-violet-800 ring-1 ring-inset ring-violet-500/25 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-400/35",
  earned_leave:
    "bg-indigo-500/15 text-indigo-800 ring-1 ring-inset ring-indigo-500/25 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/35",
  lop:
    "bg-rose-500/15 text-rose-900 ring-1 ring-inset ring-rose-500/25 dark:bg-rose-500/20 dark:text-rose-100 dark:ring-rose-400/35",
  holiday:
    "bg-slate-500/15 text-slate-700 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-400/15 dark:text-slate-100 dark:ring-slate-300/25",
  upcoming:
    "bg-slate-500/10 text-slate-600 ring-1 ring-inset ring-slate-500/15 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
  on_request:
    "bg-amber-500/15 text-amber-900 ring-1 ring-inset ring-amber-500/25 dark:bg-amber-500/20 dark:text-amber-100 dark:ring-amber-400/35",
};

type AttendanceStatusBadgeProps = {
  status: AttendanceDisplayStatus | string | null | undefined;
  /** Raw attendance notes (`src:CL|…`) — used to distinguish CL / EL / LOP / H. */
  notes?: string | null;
  className?: string;
};

export function AttendanceStatusBadge({
  status,
  notes,
  className,
}: AttendanceStatusBadgeProps) {
  if (!status || status === "upcoming" || status === "-") {
    return <span className={cn("text-muted-foreground font-medium", className)}>—</span>;
  }

  if (status === "on_request") {
    return (
      <span
        className={cn(
          "inline-flex max-w-full items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
          STATUS_STYLES.on_request,
          className,
        )}
      >
        On Request
      </span>
    );
  }

  const display = resolveAttendanceUiDisplay(status, notes);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        STATUS_STYLES[display.key],
        className,
      )}
    >
      {display.label}
    </span>
  );
}

/** History rows: upcoming working days have no status yet — show a dash. */
export function AttendanceHistoryStatusCell({
  status,
  notes,
  className,
}: AttendanceStatusBadgeProps) {
  if (!status || status === "upcoming" || status === "-") {
    return <span className={cn("text-muted-foreground font-medium", className)}>—</span>;
  }

  return <AttendanceStatusBadge status={status} notes={notes} className={className} />;
}
