import { cn } from "@/lib/utils";
import type { NotificationPriority, NotificationStatus } from "@/types/notifications";

const STATUS_STYLES: Record<NotificationStatus, string> = {
  unread: "bg-blue-500/10 text-blue-700",
  read: "bg-muted text-muted-foreground",
  archived: "bg-amber-500/10 text-amber-700",
};

const PRIORITY_STYLES: Record<NotificationPriority, string> = {
  low: "bg-slate-500/10 text-slate-700",
  medium: "bg-blue-500/10 text-blue-700",
  high: "bg-orange-500/10 text-orange-700",
  critical: "bg-red-500/10 text-red-700",
};

export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

export function NotificationPriorityBadge({ priority }: { priority: NotificationPriority }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        PRIORITY_STYLES[priority],
      )}
    >
      {priority}
    </span>
  );
}
