export const EMPLOYEE_ROUTES = {
  home: "/employee",
  attendance: "/employee/attendance",
  leave: "/employee/leave",
  payroll: "/employee/payroll",
  documents: "/employee/documents",
  assets: "/employee/assets",
  notifications: "/employee/notifications",
  profile: "/employee/profile",
} as const;

export type EmployeeRouteKey = keyof typeof EMPLOYEE_ROUTES;
