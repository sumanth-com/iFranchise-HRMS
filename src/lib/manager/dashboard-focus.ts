import { MANAGER_ROUTES } from "@/lib/manager/constants";
import type {
  ManagerActionItem,
  ManagerActionKind,
  ManagerActivityItem,
  ManagerActivityKind,
} from "@/types/manager-dashboard";

export type ManagerDashboardFocus =
  | "all"
  | "leave"
  | "performance"
  | "recruitment";

export const MANAGER_DASHBOARD_FOCUS_FILTERS: {
  id: ManagerDashboardFocus;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "leave", label: "Leave" },
  { id: "performance", label: "Performance" },
  { id: "recruitment", label: "Recruitment" },
];

const ACTION_KINDS_BY_FOCUS: Record<
  ManagerDashboardFocus,
  ManagerActionKind[] | null
> = {
  all: null,
  leave: ["leave_approval"],
  performance: ["performance_review", "probation"],
  recruitment: ["interview", "birthday"],
};

const ACTIVITY_KINDS_BY_FOCUS: Record<
  ManagerDashboardFocus,
  ManagerActivityKind[] | null
> = {
  all: null,
  leave: ["leave_applied"],
  performance: ["feedback_submitted", "promotion_recommendation"],
  recruitment: ["interview_completed", "employee_joined"],
};

export function focusModuleHref(
  focus: ManagerDashboardFocus,
  employeeId?: string | null,
): string | null {
  switch (focus) {
    case "leave": {
      const params = new URLSearchParams({ leaveStatus: "pending" });
      if (employeeId) params.set("employeeId", employeeId);
      return `${MANAGER_ROUTES.leave}?${params.toString()}`;
    }
    case "performance":
      return employeeId
        ? MANAGER_ROUTES.performanceDetail(employeeId)
        : `${MANAGER_ROUTES.performance}?reviewStatus=pending`;
    case "recruitment":
      return MANAGER_ROUTES.recruitment;
    default:
      return null;
  }
}

export function filterActionItems(
  items: ManagerActionItem[],
  focus: ManagerDashboardFocus,
  employeeId?: string | null,
): ManagerActionItem[] {
  let filtered = items;

  const kinds = ACTION_KINDS_BY_FOCUS[focus];
  if (kinds) {
    filtered = filtered.filter((item) => kinds.includes(item.kind));
  }

  if (employeeId) {
    filtered = filtered.filter(
      (item) => !item.employeeId || item.employeeId === employeeId,
    );
  }

  return filtered;
}

export function filterActivities(
  items: ManagerActivityItem[],
  focus: ManagerDashboardFocus,
  employeeId?: string | null,
): ManagerActivityItem[] {
  let filtered = items;

  const kinds = ACTIVITY_KINDS_BY_FOCUS[focus];
  if (kinds) {
    filtered = filtered.filter((item) => kinds.includes(item.kind));
  }

  if (employeeId) {
    filtered = filtered.filter(
      (item) => !item.employeeId || item.employeeId === employeeId,
    );
  }

  return filtered;
}

export function focusFilterCount(
  focus: ManagerDashboardFocus,
  kpis: {
    pendingLeaveApprovals: number;
    pendingPerformanceReviews: number;
  },
  actionItems: ManagerActionItem[],
): number | null {
  switch (focus) {
    case "all":
      return null;
    case "leave":
      return kpis.pendingLeaveApprovals;
    case "performance":
      return kpis.pendingPerformanceReviews;
    case "recruitment":
      return actionItems.filter((item) =>
        ["interview", "birthday"].includes(item.kind),
      ).length;
    default:
      return null;
  }
}
