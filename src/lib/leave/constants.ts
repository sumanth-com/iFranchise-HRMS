import type { LeaveStatus } from "@/types/leave";

/** Org-wide leave tracking for HR (team tab in Leave hub). */
export const LEAVE_ROUTES = {
  list: "/dashboard/leave",
  new: "/dashboard/leave-management/new",
  detail: (id: string) => `/dashboard/leave-management/${id}`,
  balances: "/dashboard/leave-management/balances",
  calendar: "/dashboard/leave-management/calendar",
  settings: "/dashboard/leave-management/settings",
  policy: "/dashboard/leave-management/policy",
} as const;

/** Personal / self-service leave in the HR portal main nav. */
export const SELF_LEAVE_ROUTES = {
  list: "/dashboard/leave",
  new: "/dashboard/leave/new",
} as const;

export function leaveTeamListUrl(
  searchParams?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams({ tab: "team" });
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
  }
  return `${SELF_LEAVE_ROUTES.list}?${params.toString()}`;
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  withdrawn: "Withdrawn",
};

export const LEAVE_SUMMARY_LABELS = {
  pendingRequests: "Pending Requests",
  approvedThisMonth: "Approved",
  rejectedThisMonth: "Rejected",
  employeesOnLeaveToday: "Employees On Leave Today",
  balanceUtilizationPercent: "Leave Balance Utilization",
  upcomingPlannedLeaves: "Upcoming Planned Leaves",
} as const;

export const HALF_DAY_PERIOD_LABELS = {
  morning: "First Half",
  afternoon: "Second Half",
} as const;

export const LEAVE_CALENDAR_LEGEND = {
  approved: { label: "Approved", className: "bg-emerald-500" },
  pending: { label: "Pending", className: "bg-amber-500" },
  holiday: { label: "Holiday", className: "bg-violet-500" },
  weekend: { label: "Weekend", className: "bg-muted-foreground/40" },
  halfDay: { label: "Half Day", className: "bg-orange-500" },
} as const;

export const APPROVAL_LEVEL_LABELS: Record<number, string> = {
  1: "Manager Approval",
  2: "HR Approval",
};

/** iFranchise leave policy — only these types are active in the product */
export const ALLOWED_LEAVE_TYPE_CODES = ["CL", "EL", "OH", "LOP"] as const;
