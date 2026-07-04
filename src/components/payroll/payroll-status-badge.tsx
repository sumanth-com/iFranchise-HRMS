import { cn } from "@/lib/utils";
import { PAYROLL_STATUS_LABELS } from "@/lib/payroll/constants";
import type { PayrollStatus } from "@/types/payroll";

const STATUS_STYLES: Record<PayrollStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  processing: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  processed: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  paid: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  cancelled: "bg-destructive/15 text-destructive",
};

export function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {PAYROLL_STATUS_LABELS[status]}
    </span>
  );
}
