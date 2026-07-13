import { hasAnyPermission } from "@/lib/permissions/utils";
import type { ReportKey, ReportModuleKey } from "@/types/reports";

export const REPORTS_ROUTES = {
  dashboard: "/dashboard/reports",
  hr: "/dashboard/reports/hr",
  attendance: "/dashboard/reports/attendance",
  leave: "/dashboard/reports/leave",
  payroll: "/dashboard/reports/payroll",
  performance: "/dashboard/reports/performance",
  recruitment: "/dashboard/reports/recruitment",
  assets: "/dashboard/reports/assets",
  exit: "/dashboard/reports/exit",
  exports: "/dashboard/reports/exports",
  settings: "/dashboard/reports/settings",
} as const;

export const REPORTS_SUB_NAV = [
  { title: "Dashboard", href: REPORTS_ROUTES.dashboard },
  { title: "HR Reports", href: REPORTS_ROUTES.hr },
  { title: "Attendance", href: REPORTS_ROUTES.attendance },
  { title: "Leave", href: REPORTS_ROUTES.leave },
  { title: "Payroll", href: REPORTS_ROUTES.payroll },
  { title: "Performance", href: REPORTS_ROUTES.performance },
  { title: "Recruitment", href: REPORTS_ROUTES.recruitment },
  { title: "Assets", href: REPORTS_ROUTES.assets },
  { title: "Exit", href: REPORTS_ROUTES.exit },
  { title: "Exports", href: REPORTS_ROUTES.exports },
  { title: "Settings", href: REPORTS_ROUTES.settings },
] as const;

export const DEFAULT_REPORTS_SETTINGS = {
  defaultExportFormat: "csv" as const,
  defaultDateRangeDays: 30,
  enabledModules: [
    "hr",
    "attendance",
    "leave",
    "payroll",
    "performance",
    "recruitment",
    "assets",
    "exit",
  ] as ReportModuleKey[],
  scheduleEmailEnabled: true,
  scheduleRetainRuns: 90,
};

export const REPORT_DEFINITIONS: {
  key: ReportKey;
  module: ReportModuleKey;
  title: string;
  description: string;
}[] = [
  { key: "hr_employee_master", module: "hr", title: "Employee Master Report", description: "Active workforce roster with status and org structure." },
  { key: "hr_department", module: "hr", title: "Department Report", description: "Headcount by department." },
  { key: "hr_designation", module: "hr", title: "Designation Report", description: "Headcount by designation." },
  { key: "hr_joining", module: "hr", title: "Joining Report", description: "New joiners in the selected period." },
  { key: "hr_probation", module: "hr", title: "Probation Report", description: "Employees currently on probation." },
  { key: "attendance_daily", module: "attendance", title: "Daily Attendance", description: "Attendance marks for a selected day or range." },
  { key: "attendance_weekly", module: "attendance", title: "Weekly Attendance", description: "Attendance summary for the last 7 days of the range." },
  { key: "attendance_monthly", module: "attendance", title: "Monthly Attendance", description: "Month-level attendance distribution." },
  { key: "attendance_late", module: "attendance", title: "Late Report", description: "Late punch records." },
  { key: "attendance_overtime", module: "attendance", title: "Overtime Report", description: "Attendance rows with overtime hours." },
  { key: "attendance_absent", module: "attendance", title: "Absent Report", description: "Absent attendance records." },
  { key: "attendance_holiday", module: "attendance", title: "Holiday Report", description: "Holiday and week-off marks." },
  { key: "leave_balance", module: "leave", title: "Leave Balance", description: "Current leave balances by employee and type." },
  { key: "leave_utilization", module: "leave", title: "Leave Utilization", description: "Approved leave days vs balances." },
  { key: "leave_trends", module: "leave", title: "Leave Trends", description: "Approved leave volume by month." },
  { key: "leave_rejected", module: "leave", title: "Rejected Requests", description: "Rejected leave applications." },
  { key: "leave_pending", module: "leave", title: "Pending Approvals", description: "Leave requests awaiting approval." },
  { key: "payroll_salary", module: "payroll", title: "Salary Report", description: "Active salary structures." },
  { key: "payroll_register", module: "payroll", title: "Payroll Register", description: "Payroll runs and totals." },
  { key: "payroll_deductions", module: "payroll", title: "Deductions Report", description: "Payroll runs with deduction totals." },
  { key: "payroll_bonuses", module: "payroll", title: "Bonuses Report", description: "Bonus awards across the period." },
  { key: "payroll_reimbursements", module: "payroll", title: "Reimbursements Report", description: "Expense reimbursements." },
  { key: "payroll_net", module: "payroll", title: "Net Salary Report", description: "Payslip net salary listing." },
  { key: "performance_kpi", module: "performance", title: "KPI Completion", description: "KPI assignment progress." },
  { key: "performance_goals", module: "performance", title: "Goal Progress", description: "Goal tracking status and progress." },
  { key: "performance_reviews", module: "performance", title: "Review Ratings", description: "Performance review ratings." },
  { key: "performance_promotions", module: "performance", title: "Promotion Readiness", description: "Promotion recommendations and status." },
  { key: "recruitment_jobs", module: "recruitment", title: "Open Jobs", description: "Job openings and openings status." },
  { key: "recruitment_pipeline", module: "recruitment", title: "Candidate Pipeline", description: "Candidates by stage." },
  { key: "recruitment_funnel", module: "recruitment", title: "Hiring Funnel", description: "Aggregated funnel counts." },
  { key: "recruitment_offers", module: "recruitment", title: "Offer Acceptance", description: "Offers and acceptance outcomes." },
  { key: "recruitment_time_to_hire", module: "recruitment", title: "Time to Hire", description: "Hiring velocity metrics." },
  { key: "assets_assigned", module: "assets", title: "Assigned Assets", description: "Active asset assignments." },
  { key: "assets_returned", module: "assets", title: "Returned Assets", description: "Returned asset history." },
  { key: "assets_maintenance", module: "assets", title: "Maintenance Report", description: "Maintenance tickets and cost." },
  { key: "assets_warranty", module: "assets", title: "Warranty Expiry", description: "Assets approaching warranty end." },
  { key: "exit_resignations", module: "exit", title: "Resignations", description: "Resignation cases and workflow status." },
  { key: "exit_attrition", module: "exit", title: "Attrition", description: "Monthly attrition counts." },
  { key: "exit_reasons", module: "exit", title: "Exit Reasons", description: "Resignation reasons breakdown." },
  { key: "exit_settlement", module: "exit", title: "Settlement Status", description: "Final settlement progress." },
];

export const REPORT_KEY_LABELS: Record<ReportKey, string> = Object.fromEntries(
  REPORT_DEFINITIONS.map((d) => [d.key, d.title]),
) as Record<ReportKey, string>;

export const MODULE_REPORTS: Record<ReportModuleKey, ReportKey[]> = {
  hr: REPORT_DEFINITIONS.filter((d) => d.module === "hr").map((d) => d.key),
  attendance: REPORT_DEFINITIONS.filter((d) => d.module === "attendance").map((d) => d.key),
  leave: REPORT_DEFINITIONS.filter((d) => d.module === "leave").map((d) => d.key),
  payroll: REPORT_DEFINITIONS.filter((d) => d.module === "payroll").map((d) => d.key),
  performance: REPORT_DEFINITIONS.filter((d) => d.module === "performance").map((d) => d.key),
  recruitment: REPORT_DEFINITIONS.filter((d) => d.module === "recruitment").map((d) => d.key),
  assets: REPORT_DEFINITIONS.filter((d) => d.module === "assets").map((d) => d.key),
  exit: REPORT_DEFINITIONS.filter((d) => d.module === "exit").map((d) => d.key),
};

export function canViewReports(codes: string[]) {
  return hasAnyPermission(codes, ["reports.view"]);
}
export function canExportReports(codes: string[]) {
  return hasAnyPermission(codes, ["reports.export"]);
}
export function canScheduleReports(codes: string[]) {
  return hasAnyPermission(codes, ["reports.schedule"]);
}
export function canReportsSettings(codes: string[]) {
  return hasAnyPermission(codes, ["reports.settings", "settings.manage"]);
}
