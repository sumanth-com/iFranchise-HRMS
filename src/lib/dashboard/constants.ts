import { ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { EXIT_ROUTES } from "@/lib/exit/constants";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import { ASSETS_ROUTES } from "@/lib/assets/constants";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import { REPORTS_ROUTES } from "@/lib/reports/constants";

export const DASHBOARD_QUICK_ACTIONS = [
  {
    label: "Add Employee",
    href: EMPLOYEE_ROUTES.new,
    permission: "employee.create",
  },
  {
    label: "Apply Leave",
    href: LEAVE_ROUTES.new,
    permission: "leave.create",
  },
  {
    label: "Run Payroll",
    href: PAYROLL_ROUTES.run,
    permission: "payroll.generate",
  },
  {
    label: "Create Job Opening",
    href: RECRUITMENT_ROUTES.jobs,
    permission: "recruitment.create",
  },
] as const;

export const DASHBOARD_QUICK_ACCESS = [
  {
    title: "Employees",
    href: EMPLOYEE_ROUTES.list,
    description: "Workforce directory",
    permission: "employee.view",
  },
  {
    title: "Attendance",
    href: ATTENDANCE_ROUTES.list,
    description: "Daily presence",
    permission: "attendance.view",
  },
  {
    title: "Leave",
    href: LEAVE_ROUTES.list,
    description: "Requests & balances",
    permission: "leave.view",
  },
  {
    title: "Payroll",
    href: PAYROLL_ROUTES.dashboard,
    description: "Salary processing",
    permission: "payroll.view",
  },
  {
    title: "Performance",
    href: PERFORMANCE_ROUTES.dashboard,
    description: "Goals & reviews",
    permission: "performance.view",
  },
  {
    title: "Recruitment",
    href: RECRUITMENT_ROUTES.dashboard,
    description: "Hiring pipeline",
    permission: "recruitment.view",
  },
  {
    title: "Reports",
    href: REPORTS_ROUTES.dashboard,
    description: "Analytics",
    permission: "reports.view",
  },
] as const;

export const DASHBOARD_KPI_LINKS = {
  totalEmployees: EMPLOYEE_ROUTES.list,
  presentToday: ATTENDANCE_ROUTES.list,
  onLeaveToday: LEAVE_ROUTES.list,
  absentToday: `${ATTENDANCE_ROUTES.list}?attendanceStatus=absent`,
  lateToday: `${ATTENDANCE_ROUTES.list}?attendanceStatus=late`,
  newJoinersThisMonth: EMPLOYEE_ROUTES.list,
  employeesExiting: EXIT_ROUTES.dashboard,
  openRecruitments: RECRUITMENT_ROUTES.jobs,
  pendingApprovals: LEAVE_ROUTES.list,
} as const;

export const DASHBOARD_SECONDARY_LINKS = {
  attendancePercent: ATTENDANCE_ROUTES.list,
  leaveUtilizationPercent: LEAVE_ROUTES.balances,
  payrollStatus: PAYROLL_ROUTES.dashboard,
  upcomingBirthdaysCount: EMPLOYEE_ROUTES.list,
  upcomingAnniversariesCount: EMPLOYEE_ROUTES.list,
  probationEndingSoon: EMPLOYEE_ROUTES.list,
  documentsExpiring: DOCUMENTS_ROUTES.expiring,
  assetsPendingReturn: ASSETS_ROUTES.assignments,
} as const;
