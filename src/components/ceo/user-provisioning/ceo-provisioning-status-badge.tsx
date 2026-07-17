import { cn } from "@/lib/utils";
import type { ProvisioningInvitationStatus } from "@/types/ceo-user-provisioning";

const STATUS_STYLES: Record<ProvisioningInvitationStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  accepted:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  expired:
    "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  cancelled:
    "bg-muted text-muted-foreground",
  revoked:
    "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  inactive:
    "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
};

const STATUS_LABELS: Record<ProvisioningInvitationStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
  cancelled: "Cancelled",
  revoked: "Revoked",
  inactive: "Inactive",
};

export function CeoProvisioningStatusBadge({
  status,
  className,
}: {
  status: ProvisioningInvitationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
