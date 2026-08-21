import { attendanceTeamListUrl } from "@/lib/attendance/constants";
import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";
import { HR_HUB_ROUTES } from "@/lib/dashboard/hr-hub-routes";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { EXIT_ROUTES } from "@/lib/exit/constants";
import { leaveTeamListUrl } from "@/lib/leave/constants";
import { payrollTeamListUrl } from "@/lib/payroll/constants";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";

export const HR_SELF_SERVICE_HOME = HR_PORTAL_HOME;

export const HR_OVERVIEW_ROUTES = {
  overview: "/dashboard/hr-overview",
} as const;

export const DASHBOARD_QUICK_ACTIONS = [
  {
    label: "Add Employee",
    href: EMPLOYEE_ROUTES.new,
    permission: "employee.create",
  },
] as const;

/** KPI cards only — no overlap with action cards. Administration team routes. */
export const DASHBOARD_KPI_LINKS = {
  totalEmployees: EMPLOYEE_ROUTES.list,
  presentToday: attendanceTeamListUrl({ attendanceStatus: "present" }),
  absentToday: attendanceTeamListUrl({ attendanceStatus: "absent" }),
  lateToday: attendanceTeamListUrl({ attendanceStatus: "late" }),
  halfDayToday: attendanceTeamListUrl({ attendanceStatus: "half_day" }),
  pendingLeaveApprovals: leaveTeamListUrl({ summaryFilter: "pendingRequests" }),
  exitRequests: EXIT_ROUTES.clearance,
} as const;

/** Focus Today cards on HR Overview. */
export const DASHBOARD_ACTION_LINKS = {
  onboardingReview: RECRUITMENT_ROUTES.onboarding,
  documentsExpiring: `${HR_HUB_ROUTES.teamDocuments}/expiring`,
  activeCandidates: RECRUITMENT_ROUTES.candidates,
  payrollDue: payrollTeamListUrl(),
  payrollDuePeriod: (month: number, year: number) =>
    payrollTeamListUrl({
      month: String(month),
      year: String(year),
      autoload: "1",
    }),
  interviewsToday: RECRUITMENT_ROUTES.interviews,
  onLeaveToday: leaveTeamListUrl({ summaryFilter: "employeesOnLeaveToday" }),
} as const;
