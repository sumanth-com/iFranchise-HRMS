import { cn } from "@/lib/utils";
import { EMPLOYMENT_STATUS_LABELS } from "@/lib/employees/constants";
import type { EmploymentStatus } from "@/types/auth";

const STATUS_STYLES: Record<EmploymentStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  probation: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  on_leave: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  suspended: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  terminated: "bg-destructive/10 text-destructive",
  resigned: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
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
