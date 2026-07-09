import { cn } from "@/lib/utils";
import type { AuditEventStatus, AuditPriority } from "@/types/audit";

const STATUS_STYLES: Record<AuditEventStatus, string> = {
  success: "bg-emerald-500/10 text-emerald-700",
  failed: "bg-red-500/10 text-red-700",
};

const PRIORITY_STYLES: Record<AuditPriority, string> = {
  low: "bg-slate-500/10 text-slate-700",
  medium: "bg-blue-500/10 text-blue-700",
  high: "bg-orange-500/10 text-orange-700",
  critical: "bg-red-500/10 text-red-700",
};

export function AuditStatusBadge({ status }: { status: AuditEventStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", STATUS_STYLES[status])}>
      {status}
    </span>
  );
}

export function AuditPriorityBadge({ priority }: { priority: AuditPriority }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", PRIORITY_STYLES[priority])}>
      {priority}
    </span>
  );
}
