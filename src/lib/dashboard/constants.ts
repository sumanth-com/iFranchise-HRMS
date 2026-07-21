import { attendanceTeamListUrl } from "@/lib/attendance/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { leaveTeamListUrl } from "@/lib/leave/constants";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";

export const HR_SELF_SERVICE_HOME = "/" as const;

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

/** KPI cards only — no overlap with Priority Tasks. */
export const DASHBOARD_KPI_LINKS = {
  totalEmployees: EMPLOYEE_ROUTES.list,
  presentToday: attendanceTeamListUrl(),
  onLeaveToday: leaveTeamListUrl(),
  absentToday: attendanceTeamListUrl({ attendanceStatus: "absent" }),
  pendingLeaveApprovals: leaveTeamListUrl(),
} as const;

export const DASHBOARD_ACTION_LINKS = {
  interviewsToday: RECRUITMENT_ROUTES.interviews,
  probation: EMPLOYEE_ROUTES.list,
  payrollDue: PAYROLL_ROUTES.run,
  offersPending: RECRUITMENT_ROUTES.offers,
} as const;
