import { REIMBURSEMENT_STATUS_LABELS } from "@/lib/payroll/constants";
import type { ReimbursementStatus } from "@/types/payroll";

const STATUS_STYLES: Record<ReimbursementStatus, string> = {
  pending: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  approved: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  rejected: "bg-red-500/15 text-red-800 dark:text-red-200",
  paid: "bg-primary/10 text-primary",
  cancelled: "border text-muted-foreground",
};

export function ReimbursementStatusBadge({
  status,
}: {
  status: ReimbursementStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {REIMBURSEMENT_STATUS_LABELS[status]}
    </span>
  );
}
