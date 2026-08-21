import { cn } from "@/lib/utils";
import { EMPLOYMENT_STATUS_LABELS } from "@/lib/employees/constants";
import type { EmploymentStatus } from "@/types/auth";

const STATUS_STYLES: Record<EmploymentStatus, string> = {
  draft:
    "bg-muted text-muted-foreground ring-1 ring-border/50 dark:bg-white/5 dark:text-muted-foreground dark:ring-white/10",
  probation:
    "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/15 dark:bg-amber-400/12 dark:text-amber-300 dark:ring-amber-400/25",
  active:
    "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15 dark:bg-emerald-400/12 dark:text-emerald-300 dark:ring-emerald-400/25",
  on_leave:
    "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/15 dark:bg-blue-400/12 dark:text-blue-300 dark:ring-blue-400/25",
  suspended:
    "bg-orange-500/10 text-orange-700 ring-1 ring-orange-500/15 dark:bg-orange-400/12 dark:text-orange-300 dark:ring-orange-400/25",
  terminated:
    "bg-destructive/10 text-destructive ring-1 ring-destructive/15 dark:bg-destructive/15 dark:ring-destructive/30",
  resigned:
    "bg-violet-500/10 text-violet-700 ring-1 ring-violet-500/15 dark:bg-violet-400/12 dark:text-violet-300 dark:ring-violet-400/25",
};

type EmploymentStatusBadgeProps = {
  status: EmploymentStatus;
  className?: string;
};

export function EmploymentStatusBadge({
  status,
  className,
}: EmploymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {EMPLOYMENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}
