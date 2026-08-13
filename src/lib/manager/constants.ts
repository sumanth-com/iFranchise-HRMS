import { buildEmployeeRouteRef } from "@/lib/employees/routing";
import { REPORTS_ROUTES } from "@/lib/reports/constants";
import type { EmployeeRouteIdentity } from "@/types/employee";

export const MANAGER_ROUTES = {
  home: "/manager",
  overview: "/manager/overview",
  team: "/manager/team",
  teamMember: (employee: EmployeeRouteIdentity | string) =>
    `/manager/team/${typeof employee === "string" ? employee : buildEmployeeRouteRef(employee)}`,
  attendance: "/manager/attendance",
  attendanceMy: "/manager/attendance",
  attendanceTeam: "/manager/attendance/team",
  leave: "/manager/leave",
  leaveTeam: "/manager/leave/team",
  leaveNew: "/manager/leave/new",
  leaveDetail: (id: string) => `/manager/leave/team?leaveId=${id}`,
  payroll: "/manager/payroll",
  payrollHistory: "/manager/payroll/history",
  resignation: "/manager/resignation",
  performance: "/manager/performance",
  performanceGoals: "/manager/performance/goals",
  performanceKpis: "/manager/performance/kpis",
  performanceFeedback: "/manager/performance/feedback",
  performanceOneOnOnes: "/manager/performance/one-on-ones",
  performancePromotions: "/manager/performance/promotions",
  performanceDetail: (employeeId: string, tab?: "feedback" | "oneOnOne") => {
    if (tab === "feedback") {
      return `${MANAGER_ROUTES.performanceFeedback}?employeeId=${employeeId}`;
    }
    if (tab === "oneOnOne") {
      return `${MANAGER_ROUTES.performanceOneOnOnes}?employeeId=${employeeId}`;
    }
    return `${MANAGER_ROUTES.performanceGoals}?employeeId=${employeeId}`;
  },
  recruitment: "/manager/recruitment",
  recruitmentJobs: "/manager/recruitment/jobs",
  recruitmentCandidates: "/manager/recruitment/candidates",
  recruitmentOffers: "/manager/recruitment/offers",
  recruitmentInterviews: "/manager/recruitment/interviews",
  recruitmentDetail: (candidateId: string) =>
    `${MANAGER_ROUTES.recruitmentCandidates}?candidateId=${candidateId}`,
  reports: "/manager/reports",
  reportsAttendance: "/manager/reports/attendance",
  reportsLeave: "/manager/reports/leave",
  reportsPerformance: "/manager/reports/performance",
  reportsRecruitment: "/manager/reports/recruitment",
  reportsTeam: "/manager/reports/hr",
  notifications: "/manager/notifications",
  notificationsCenter: "/manager/notifications/center",
  notificationsHistory: "/manager/notifications/history",
  documents: "/manager/documents",
  profile: "/manager/profile",
  assets: "/manager/assets",
  goals: "/manager/goals",
  settings: "/manager/settings",
} as const;

export const MANAGER_GOALS_SUB_NAV = [
  { title: "Goals & OKRs", href: MANAGER_ROUTES.goals },
  { title: "KPIs", href: `${MANAGER_ROUTES.goals}/kpis` },
  { title: "Feedback", href: `${MANAGER_ROUTES.goals}/feedback` },
  { title: "1:1 Meetings", href: `${MANAGER_ROUTES.goals}/one-on-ones` },
  { title: "Promotions", href: `${MANAGER_ROUTES.goals}/promotions` },
] as const;

export const MANAGER_REPORTS_SUB_NAV = [
  { title: "Attendance", href: REPORTS_ROUTES.attendance },
  { title: "Leave", href: REPORTS_ROUTES.leave },
  { title: "Performance", href: REPORTS_ROUTES.performance },
  { title: "Recruitment", href: REPORTS_ROUTES.recruitment },
  { title: "Team", href: REPORTS_ROUTES.hr },
] as const;

export const MANAGER_SELF_SERVICE_DASHBOARD_KPI_LINKS = {
  attendance: MANAGER_ROUTES.attendance,
  workingHours: MANAGER_ROUTES.attendance,
  leaveBalance: MANAGER_ROUTES.leave,
  pendingLeaveRequests: `${MANAGER_ROUTES.leave}?status=pending`,
} as const;

export const MANAGER_DASHBOARD_KPI_LINKS = {
  teamSize: MANAGER_ROUTES.team,
  presentToday: `${MANAGER_ROUTES.attendanceTeam}?attendanceStatus=present`,
  onLeaveToday: `${MANAGER_ROUTES.attendanceTeam}?attendanceStatus=absent`,
  lateToday: `${MANAGER_ROUTES.attendanceTeam}?attendanceStatus=late`,
  pendingLeaveApprovals: `${MANAGER_ROUTES.leaveTeam}?leaveStatus=pending`,
  pendingPerformanceReviews: MANAGER_ROUTES.performanceGoals,
  openRecruitmentRequests: MANAGER_ROUTES.recruitmentJobs,
  probationEndingSoon: MANAGER_ROUTES.reportsTeam,
} as const;

export const MANAGER_QUICK_ACTIONS = [
  {
    id: "approve-leave",
    label: "Team Leave",
    href: (employeeId?: string) => {
      const params = new URLSearchParams({ leaveStatus: "pending" });
      if (employeeId) params.set("employeeId", employeeId);
      return `${MANAGER_ROUTES.leaveTeam}?${params.toString()}`;
    },
  },
  {
    id: "team-attendance",
    label: "Team Attendance",
    href: (employeeId?: string) => {
      if (!employeeId) return MANAGER_ROUTES.attendanceTeam;
      return `${MANAGER_ROUTES.attendanceTeam}?employeeId=${employeeId}`;
    },
  },
  {
    id: "add-feedback",
    label: "Add Feedback",
    href: (employeeId?: string) =>
      employeeId
        ? MANAGER_ROUTES.performanceDetail(employeeId, "feedback")
        : MANAGER_ROUTES.performanceFeedback,
  },
  {
    id: "schedule-one-on-one",
    label: "Schedule 1:1",
    href: (employeeId?: string) =>
      employeeId
        ? MANAGER_ROUTES.performanceDetail(employeeId, "oneOnOne")
        : MANAGER_ROUTES.performanceOneOnOnes,
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
