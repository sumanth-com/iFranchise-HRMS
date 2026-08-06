import { HR_HUB_ROUTES } from "@/lib/dashboard/hr-hub-routes";

export const EMPLOYEE_ROUTES = {
  home: "/employee",
  attendance: "/employee/attendance",
  attendancePolicy: "/employee/attendance/policy",
  directory: "/employee/directory",
  leave: "/employee/leave",
  leavePolicy: "/employee/leave/policy",
  resignation: "/employee/resignation",
  payroll: "/employee/payroll",
  payrollPolicy: "/employee/payroll/policy",
  payrollHistory: "/employee/payroll/history",
  documents: "/employee/documents",
  profile: "/employee/profile",
  assets: "/employee/assets",
  notifications: "/employee/notifications",
  settings: "/employee/settings",
  help: "/employee/help",
} as const;

export type EmployeeRouteKey = keyof typeof EMPLOYEE_ROUTES;

/** Self-service dashboard KPI destinations in the employee portal. */
export const EMPLOYEE_DASHBOARD_KPI_LINKS = {
  attendance: EMPLOYEE_ROUTES.attendance,
  workingHours: EMPLOYEE_ROUTES.attendance,
  leaveBalance: EMPLOYEE_ROUTES.leave,
  pendingLeaveRequests: `${EMPLOYEE_ROUTES.leave}?status=pending`,
} as const;

/** Self-service dashboard KPI destinations in the HR portal home (/dashboard). */
export const HR_SELF_SERVICE_DASHBOARD_KPI_LINKS = {
  attendance: HR_HUB_ROUTES.myAttendance,
  workingHours: HR_HUB_ROUTES.myAttendance,
  leaveBalance: HR_HUB_ROUTES.myLeave,
  pendingLeaveRequests: `${HR_HUB_ROUTES.myLeave}?status=pending`,
} as const;
