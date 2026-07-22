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
