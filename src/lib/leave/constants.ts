import type { LeaveStatus } from "@/types/leave";

import { hubTeamListUrl } from "@/lib/dashboard/hub-paths";

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
  team: "/dashboard/leave/team",
  new: "/dashboard/leave/new",
  policy: "/dashboard/leave/policy",
} as const;

export function leaveTeamListUrl(
  searchParams?: Record<string, string | undefined>,
) {
  return hubTeamListUrl(SELF_LEAVE_ROUTES.list, searchParams);
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  withdrawn: "Withdrawn",
};

export const LEAVE_SUMMARY_LABELS = {
  pendingRequests: "Pending Requests",
  pendingHrReview: "Pending HR Review",
  approvedThisMonth: "Approved by HR",
  rejectedThisMonth: "Rejected by HR",
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
  weekend: { label: "Weekly holiday", className: "bg-muted-foreground/40" },
  halfDay: { label: "Half day", className: "bg-orange-500" },
  sandwich: { label: "Sandwich", className: "bg-sky-500" },
  lop: { label: "LOP", className: "bg-slate-500" },
} as const;

export const APPROVAL_LEVEL_LABELS: Record<number, string> = {
  1: "HR Approval",
  2: "CEO Approval",
};

/** Shown when leave is awaiting the CEO (e.g. HR applicants go straight to CEO). */
export const CEO_APPROVAL_STAGE_LABEL = "CEO Approval";

export function leaveApprovalStageLabel(
  level: number | null | undefined,
  options?: { awaitingCeo?: boolean; hrDirectToCeo?: boolean },
): string {
  if (options?.awaitingCeo || options?.hrDirectToCeo) {
    return CEO_APPROVAL_STAGE_LABEL;
  }
  if (level === 2) {
    return CEO_APPROVAL_STAGE_LABEL;
  }
  if (level == null) return "Pending";
  return APPROVAL_LEVEL_LABELS[level] ?? `Level ${level}`;
}

/** iFranchise leave policy — active leave types (including LOP for payroll tracking). */
export const ALLOWED_LEAVE_TYPE_CODES = ["CL", "SL", "EL", "OH", "PL", "LOP"] as const;

/** Types available in Apply Leave — CL/EL monthly accrual; OH from the company list; PL when eligible; LOP unpaid. SL not offered. */
export const LEAVE_APPLY_TYPE_CODES = ["CL", "EL", "OH", "PL", "LOP"] as const;

/** Types that cannot be applied through the normal leave form. */
export const NON_APPLY_LEAVE_TYPE_CODES = [] as const;

const LEAVE_TYPE_CODE_RANK = new Map(
  ALLOWED_LEAVE_TYPE_CODES.map((code, index) => [code, index]),
);

export function sortByLeaveTypeCode<T extends { code?: string | null }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftRank = left.code ? LEAVE_TYPE_CODE_RANK.get(left.code as (typeof ALLOWED_LEAVE_TYPE_CODES)[number]) : undefined;
    const rightRank = right.code ? LEAVE_TYPE_CODE_RANK.get(right.code as (typeof ALLOWED_LEAVE_TYPE_CODES)[number]) : undefined;
    return (leftRank ?? 99) - (rightRank ?? 99);
  });
}

/** Leave balance summary cards on My Leave — Casual, Earned, Optional Holiday. */
export const LEAVE_BALANCE_CARD_CODES = ["CL", "EL", "OH"] as const;

/** Leave balance UI cards — SL is not offered. LOP is unpaid and shown via Apply Leave / payroll. */
export const LEAVE_BALANCE_DISPLAY_CODES = ["CL", "EL", "PL", "OH"] as const;

export const LEAVE_BALANCE_DISPLAY_LABELS: Record<
  (typeof LEAVE_BALANCE_DISPLAY_CODES)[number],
  string
> = {
  CL: "Casual Leave",
  EL: "Earned Leave",
  PL: "Menstruation Leave",
  OH: "Optional Holiday",
};

export const LEAVE_BALANCE_CARD_TONES: Record<
  (typeof LEAVE_BALANCE_DISPLAY_CODES)[number],
  { accent: string; iconBg: string }
> = {
  CL: { accent: "text-indigo-600 dark:text-indigo-400", iconBg: "bg-indigo-500/10" },
  EL: { accent: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-500/10" },
  PL: { accent: "text-rose-600 dark:text-rose-400", iconBg: "bg-rose-500/10" },
  OH: { accent: "text-violet-600 dark:text-violet-400", iconBg: "bg-violet-500/10" },
};
