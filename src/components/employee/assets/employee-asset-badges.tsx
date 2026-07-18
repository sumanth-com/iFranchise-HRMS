import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

import {
  ASSIGNMENT_STATUS_LABELS,
  CONDITION_LABELS,
} from "@/lib/assets/constants";
import type { AssetAssignmentStatus, AssetCondition } from "@/types/assets";
import type { EmployeeAssetWarranty } from "@/types/employee-assets";
import { cn } from "@/lib/utils";

const CONDITION_STYLES: Record<AssetCondition, string> = {
  excellent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  good: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  fair: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  poor: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  damaged: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const STATUS_STYLES: Record<AssetAssignmentStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  returned: "bg-muted text-muted-foreground",
  transferred: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  lost: "bg-red-500/10 text-red-600 dark:text-red-400",
  damaged: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export function ConditionBadge({ condition }: { condition: AssetCondition }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        CONDITION_STYLES[condition],
      )}
    >
      {CONDITION_LABELS[condition]}
    </span>
  );
}

export function AssignmentStatusBadge({ status }: { status: AssetAssignmentStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        STATUS_STYLES[status],
      )}
    >
      {ASSIGNMENT_STATUS_LABELS[status]}
    </span>
  );
}

export function WarrantyBadge({ warranty }: { warranty: EmployeeAssetWarranty }) {
  if (warranty.status === "none") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <ShieldX className="size-3" />
        No warranty
      </span>
    );
  }
  if (warranty.status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
        <ShieldAlert className="size-3" />
        Expired
      </span>
    );
  }
  const soon = warranty.daysRemaining !== null && warranty.daysRemaining <= 30;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        soon
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      )}
    >
      <ShieldCheck className="size-3" />
      {soon ? `${warranty.daysRemaining}d left` : "Active"}
    </span>
  );
}
