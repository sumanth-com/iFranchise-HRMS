import { cn } from "@/lib/utils";
import { LEAVE_STATUS_LABELS } from "@/lib/leave/constants";
import type { LeaveStatus } from "@/types/leave";

const STATUS_STYLES: Record<LeaveStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  withdrawn: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

type LeaveStatusBadgeProps = {
  status: LeaveStatus;
  className?: string;
};

export function LeaveStatusBadge({ status, className }: LeaveStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {LEAVE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
