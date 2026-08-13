import type { RecordStatus } from "@/types/auth";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<RecordStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700",
  inactive: "bg-amber-500/10 text-amber-700",
  archived: "bg-slate-500/10 text-slate-600",
};

export function RoleStatusBadge({ status }: { status: RecordStatus }) {
  const label = status === "inactive" || status === "archived" ? "Disabled" : "Active";
  const tone = status === "active" ? STATUS_STYLES.active : STATUS_STYLES.inactive;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        tone,
      )}
    >
      {label}
    </span>
  );
}
