import { cn } from "@/lib/utils";
import type { ProvisioningInvitationStatus } from "@/types/ceo-user-provisioning";

const STATUS_STYLES: Record<ProvisioningInvitationStatus, string> = {
  pending:
    "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
  opened:
    "bg-violet-50 text-violet-800 ring-1 ring-violet-200/80",
  active:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
  expired:
    "bg-orange-50 text-orange-800 ring-1 ring-orange-200/80",
  cancelled:
    "bg-muted text-muted-foreground ring-1 ring-border/80",
  revoked:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200/80",
  inactive:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200/80",
  deactivated:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200/80",
};

const STATUS_LABELS: Record<ProvisioningInvitationStatus, string> = {
  pending: "Pending",
  opened: "Opened",
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
  revoked: "Revoked",
  inactive: "Deactivated",
  deactivated: "Deactivated",
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
