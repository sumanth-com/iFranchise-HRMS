import { cn } from "@/lib/utils";
import {
  PAYROLL_ITEM_STATUS_LABELS,
  PAYROLL_STATUS_LABELS,
} from "@/lib/payroll/constants";
import type { PayrollItemLifecycleStatus, PayrollStatus } from "@/types/payroll";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  processing: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  processed: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  approved: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  paid: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  cancelled: "bg-destructive/15 text-destructive",
  reviewed: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  sent: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  locked: "bg-slate-500/15 text-slate-700 dark:text-slate-200",
};

export function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? STATUS_STYLES.draft,
      )}
    >
      {PAYROLL_STATUS_LABELS[status]}
    </span>
  );
}

export function PayrollItemStatusBadge({
  status,
}: {
  status: PayrollItemLifecycleStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? STATUS_STYLES.draft,
      )}
    >
      {PAYROLL_ITEM_STATUS_LABELS[status]}
    </span>
  );
}
