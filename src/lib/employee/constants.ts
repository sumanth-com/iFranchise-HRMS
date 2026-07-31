import { SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { SELF_LEAVE_ROUTES } from "@/lib/leave/constants";

export const EMPLOYEE_ROUTES = {
  home: "/employee",
  attendance: "/employee/attendance",
  attendancePolicy: "/employee/attendance/policy",
  directory: "/employee/directory",
  leave: "/employee/leave",
  leavePolicy: "/employee/leave/policy",
  resignation: "/employee/resignation",
  payroll: "/employee/payroll",
  payrollHistory: "/employee/payroll/history",
  documents: "/employee/documents",
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

/** Self-service dashboard KPI destinations in the HR portal home (/). */
export const HR_SELF_SERVICE_DASHBOARD_KPI_LINKS = {
  attendance: SELF_ATTENDANCE_ROUTES.list,
  workingHours: SELF_ATTENDANCE_ROUTES.list,
  leaveBalance: SELF_LEAVE_ROUTES.list,
  pendingLeaveRequests: `${SELF_LEAVE_ROUTES.list}?status=pending`,
} as const;
