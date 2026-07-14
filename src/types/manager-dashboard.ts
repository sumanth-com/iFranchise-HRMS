import type { TeamMemberSummary } from "@/lib/manager/services/team-hierarchy";

export type ManagerDashboardKpis = {
  teamSize: number;
  presentToday: number;
  onLeaveToday: number;
  lateToday: number;
  pendingLeaveApprovals: number;
  pendingPerformanceReviews: number;
  openRecruitmentRequests: number;
  probationEndingSoon: number;
};

export type ManagerActionKind =
  | "leave_approval"
  | "attendance_correction"
  | "performance_review"
  | "interview"
  | "probation"
  | "birthday";

export type ManagerActionItem = {
  id: string;
  kind: ManagerActionKind;
  title: string;
  subtitle: string;
  meta: string;
  urgency: "high" | "medium" | "low";
  employeeId?: string;
  href?: string;
};

export type ManagerActivityKind =
  | "leave_applied"
  | "attendance_regularized"
  | "feedback_submitted"
  | "employee_joined"
  | "promotion_recommendation"
  | "interview_completed";

export type ManagerActivityItem = {
  id: string;
  kind: ManagerActivityKind;
  title: string;
  description: string;
  occurredAt: string;
  employeeId?: string;
};

export type ManagerDashboardFocus =
  | "all"
  | "leave"
  | "performance"
  | "recruitment";

export { MANAGER_DASHBOARD_FOCUS_FILTERS } from "@/lib/manager/dashboard-focus";

export type ManagerDashboardData = {
  generatedAt: string;
  teamMembers: TeamMemberSummary[];
  kpis: ManagerDashboardKpis;
  actionItems: ManagerActionItem[];
  activities: ManagerActivityItem[];
};
