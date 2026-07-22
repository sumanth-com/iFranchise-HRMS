import { EMPLOYEE_ACCOUNT_STATUS_LABELS } from "@/lib/employees/constants";
import { cn } from "@/lib/utils";
import type { EmployeeAccountStatus } from "@/types/employee";

const ACCOUNT_STATUS_CLASSES: Record<EmployeeAccountStatus, string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  invited: "border-blue-200 bg-blue-50 text-blue-700",
  invitation_pending: "border-amber-200 bg-amber-50 text-amber-700",
  invitation_accepted: "border-sky-200 bg-sky-50 text-sky-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  inactive: "border-zinc-200 bg-zinc-100 text-zinc-700",
  suspended: "border-red-200 bg-red-50 text-red-700",
  archived: "border-zinc-300 bg-zinc-200 text-zinc-800",
};

export function getEmployeeLoginStatus(status: EmployeeAccountStatus) {
  if (status === "active") return "Enabled";
  if (status === "suspended") return "Suspended";
  if (status === "inactive") return "Disabled";
  if (status === "invitation_pending" || status === "invited" || status === "invitation_accepted") {
    return "Invite pending";
  }
  return "Not provisioned";
}

export function EmployeeAccountStatusBadge({
  status,
  className,
}: {
  status: EmployeeAccountStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        ACCOUNT_STATUS_CLASSES[status],
        className,
      )}
    >
      {EMPLOYEE_ACCOUNT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function EmployeeLoginStatusBadge({
  status,
  className,
}: {
  status: EmployeeAccountStatus;
  className?: string;
}) {
  const loginStatus = getEmployeeLoginStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        status === "active"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : status === "suspended"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-muted bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      {loginStatus}
    </span>
  );
}
