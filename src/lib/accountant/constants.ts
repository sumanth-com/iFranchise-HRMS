export const ACCOUNTANT_ROUTES = {
  home: "/accountant",
  profile: "/accountant/profile",
  leave: "/accountant/leave",
  leavePolicy: "/accountant/leave/policy",
  attendance: "/accountant/attendance",
  attendancePolicy: "/accountant/attendance/policy",
  attendanceLocation: (attendanceId: string) =>
    `/accountant/attendance/location/${attendanceId}`,
  documents: "/accountant/documents",
  assets: "/accountant/assets",
  goals: "/accountant/goals",
  notifications: "/accountant/notifications",
  settings: "/accountant/settings",
  /** Org finance overview (Administration → Finance Dashboard). */
  financeDashboard: "/accountant/finance",
  /** Team payroll base path (section routes hang under this). */
  payroll: "/accountant/payroll",
  payrollRun: "/accountant/payroll/run",
  reimbursements: "/accountant/payroll/reimbursements",
  payslips: "/accountant/payroll/payslips",
  salaryStructures: "/accountant/payroll/salary-structures",
  employeeAccounts: "/accountant/payroll/employee-accounts",
  reports: "/accountant/reports",
  reportsPayroll: "/accountant/reports/payroll",
  audit: "/accountant/audit",
  auditLogs: "/accountant/audit/logs",
  auditTimeline: "/accountant/audit/timeline",
  help: "/accountant/help",
} as const;

export const ACCOUNTANT_DASHBOARD_KPI_LINKS = {
  attendance: ACCOUNTANT_ROUTES.attendance,
  workingHours: ACCOUNTANT_ROUTES.attendance,
  leaveBalance: ACCOUNTANT_ROUTES.leave,
  pendingLeaveRequests: `${ACCOUNTANT_ROUTES.leave}?status=pending`,
} as const;
