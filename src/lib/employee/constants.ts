export const EMPLOYEE_ROUTES = {
  home: "/employee",
  attendance: "/employee/attendance",
  directory: "/employee/directory",
  leave: "/employee/leave",
  payroll: "/employee/payroll",
  documents: "/employee/documents",
  assets: "/employee/assets",
  notifications: "/employee/notifications",
  settings: "/employee/settings",
  help: "/employee/help",
} as const;

export type EmployeeRouteKey = keyof typeof EMPLOYEE_ROUTES;
