import type { RecordStatus } from "@/types/auth";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<RecordStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700",
  inactive: "bg-amber-500/10 text-amber-700",
  archived: "bg-slate-500/10 text-slate-600",
};

export function RoleStatusBadge({ status }: { status: RecordStatus }) {
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
