import { buildEmployeeRouteRef } from "@/lib/employees/routing";
import type { EmployeeRouteIdentity } from "@/types/employee";

export const MANAGER_ROUTES = {
  home: "/manager",
  team: "/manager/team",
  teamMember: (employee: EmployeeRouteIdentity | string) =>
    `/manager/team/${typeof employee === "string" ? employee : buildEmployeeRouteRef(employee)}`,
  attendance: "/manager/attendance",
  attendanceMy: "/manager/attendance",
  attendanceTeam: "/manager/attendance/team",
  leave: "/manager/leave",
  leaveNew: "/manager/leave/new",
  leaveDetail: (id: string) => `/manager/leave?leaveId=${id}`,
  payroll: "/manager/payroll",
  payrollHistory: "/manager/payroll/history",
  resignation: "/manager/resignation",
  performance: "/manager/performance",
  performanceDetail: (employeeId: string, tab?: "feedback" | "oneOnOne") => {
    const params = new URLSearchParams({ employeeId });
    if (tab) params.set("tab", tab);
    return `/manager/performance?${params.toString()}`;
  },
  recruitment: "/manager/recruitment",
  recruitmentDetail: (candidateId: string) => `/manager/recruitment?candidateId=${candidateId}`,
  reports: "/manager/reports",
  notifications: "/manager/notifications",
  notificationsCenter: "/manager/notifications/center",
  notificationsHistory: "/manager/notifications/history",
  documents: "/manager/documents",
  profile: "/manager/profile",
  settings: "/manager/settings",
} as const;

export const MANAGER_DASHBOARD_KPI_LINKS = {
  teamSize: MANAGER_ROUTES.team,
  presentToday: MANAGER_ROUTES.attendanceTeam,
  onLeaveToday: `${MANAGER_ROUTES.attendanceTeam}&attendanceStatus=absent`,
  lateToday: MANAGER_ROUTES.attendanceTeam,
  pendingLeaveApprovals: `${MANAGER_ROUTES.leave}?leaveStatus=pending`,
  pendingPerformanceReviews: MANAGER_ROUTES.performance,
  openRecruitmentRequests: MANAGER_ROUTES.recruitment,
  probationEndingSoon: MANAGER_ROUTES.performance,
} as const;

export const MANAGER_QUICK_ACTIONS = [
  {
    id: "approve-leave",
    label: "Approve Leave",
    href: (employeeId?: string) => {
      const params = new URLSearchParams({ leaveStatus: "pending" });
      if (employeeId) params.set("employeeId", employeeId);
      return `${MANAGER_ROUTES.leave}?${params.toString()}`;
    },
  },
  {
    id: "team-attendance",
    label: "Team Attendance",
    href: (employeeId?: string) => {
      if (!employeeId) return MANAGER_ROUTES.attendance;
      return `${MANAGER_ROUTES.attendance}?employeeId=${employeeId}`;
    },
  },
  {
    id: "add-feedback",
    label: "Add Feedback",
    href: (employeeId?: string) =>
      employeeId
        ? MANAGER_ROUTES.performanceDetail(employeeId, "feedback")
        : `${MANAGER_ROUTES.performance}?tab=feedback`,
  },
  {
    id: "schedule-one-on-one",
    label: "Schedule 1:1",
    href: (employeeId?: string) =>
      employeeId
        ? MANAGER_ROUTES.performanceDetail(employeeId, "oneOnOne")
        : `${MANAGER_ROUTES.performance}?tab=oneOnOne`,
  },
] as const;

export type ManagerQuickActionId = (typeof MANAGER_QUICK_ACTIONS)[number]["id"];

export type ManagerActionCenterSection =
  | "leave"
  | "attendance"
  | "reviews"
  | "interviews"
  | "probation"
  | "birthdays";
