import { hasAnyPermission, hasPermission } from "@/lib/permissions/utils";
import { ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { ASSETS_ROUTES } from "@/lib/assets/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import { REPORTS_ROUTES } from "@/lib/reports/constants";
import type { DashboardPermissions } from "@/types/dashboard";
import {
  BarChart3,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

const ORG_VIEW_PERMISSIONS = [
  "organization.view",
  "branch.view",
  "department.view",
  "designation.view",
  "holiday.view",
  "work_location.view",
  "employment_type.view",
  "shift.view",
];

export function buildDashboardPermissions(codes: string[]): DashboardPermissions {
  return {
    employees: hasPermission(codes, "employee.view"),
    attendance: hasPermission(codes, "attendance.view"),
    leave: hasPermission(codes, "leave.view"),
    payroll: hasPermission(codes, "payroll.view"),
    performance: hasPermission(codes, "performance.view"),
    recruitment: hasPermission(codes, "recruitment.view"),
    documents: hasPermission(codes, "documents.view"),
    assets: hasPermission(codes, "asset.view"),
    exit: hasPermission(codes, "exit.view"),
    reports: hasPermission(codes, "reports.view"),
    audit: hasPermission(codes, "audit.view"),
    organization: hasAnyPermission(codes, ORG_VIEW_PERMISSIONS),
  };
}

export type QuickAccessItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  permission: keyof DashboardPermissions;
};

export const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  { key: "employees", label: "Employees", href: EMPLOYEE_ROUTES.list, icon: Users, permission: "employees" },
  { key: "attendance", label: "Attendance", href: ATTENDANCE_ROUTES.list, icon: Clock, permission: "attendance" },
  { key: "leave", label: "Leave", href: LEAVE_ROUTES.list, icon: Calendar, permission: "leave" },
  { key: "payroll", label: "Payroll", href: PAYROLL_ROUTES.dashboard, icon: DollarSign, permission: "payroll" },
  { key: "performance", label: "Performance", href: PERFORMANCE_ROUTES.dashboard, icon: Target, permission: "performance" },
  { key: "recruitment", label: "Recruitment", href: RECRUITMENT_ROUTES.dashboard, icon: Briefcase, permission: "recruitment" },
  { key: "reports", label: "Reports", href: REPORTS_ROUTES.dashboard, icon: BarChart3, permission: "reports" },
];

export type QuickActionItem = {
  key: string;
  label: string;
  href: string;
  permission: keyof DashboardPermissions;
};

export const QUICK_ACTION_ITEMS: QuickActionItem[] = [
  { key: "add-employee", label: "Add Employee", href: EMPLOYEE_ROUTES.new, permission: "employees" },
  { key: "apply-leave", label: "Apply Leave", href: LEAVE_ROUTES.new, permission: "leave" },
  { key: "run-payroll", label: "Run Payroll", href: PAYROLL_ROUTES.run, permission: "payroll" },
  { key: "create-job", label: "Create Job Opening", href: `${RECRUITMENT_ROUTES.jobs}?action=new`, permission: "recruitment" },
];

export const KPI_LINKS = {
  totalEmployees: EMPLOYEE_ROUTES.list,
  presentToday: ATTENDANCE_ROUTES.list,
  onLeaveToday: LEAVE_ROUTES.calendar,
  absentToday: ATTENDANCE_ROUTES.list,
  lateToday: ATTENDANCE_ROUTES.list,
  newJoinersThisMonth: EMPLOYEE_ROUTES.list,
  employeesExiting: "/dashboard/exit/resignations",
  openRecruitments: RECRUITMENT_ROUTES.jobs,
  pendingApprovals: LEAVE_ROUTES.list,
} as const;

export const SECONDARY_LINKS = {
  attendancePercent: ATTENDANCE_ROUTES.list,
  leaveUtilizationPercent: LEAVE_ROUTES.balances,
  payrollStatus: PAYROLL_ROUTES.dashboard,
  upcomingBirthdays: EMPLOYEE_ROUTES.list,
  upcomingAnniversaries: EMPLOYEE_ROUTES.list,
  probationEndingSoon: EMPLOYEE_ROUTES.list,
  documentsExpiring: "/dashboard/documents/expiring",
  assetsPendingReturn: ASSETS_ROUTES.assignments,
} as const;
