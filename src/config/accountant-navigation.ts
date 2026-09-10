import {
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  FileText,
  LaptopMinimal,
  LayoutDashboard,
  Settings,
  Target,
  UserRound,
  Wallet,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";

/**
 * Accountant portal sidebar — same Self-service / Administration pattern as HR & Manager.
 * Administration: Finance Dashboard, Team Payroll, Reports only (no duplicate Reimbursements nav).
 */
export const accountantNavItems: NavigationItem[] = [
  // ── Self-service (personal workspace) ────────────────────────────
  {
    title: "Dashboard",
    href: ACCOUNTANT_ROUTES.home,
    icon: LayoutDashboard,
    section: "Self-service",
  },
  {
    title: "My Profile",
    href: ACCOUNTANT_ROUTES.profile,
    icon: UserRound,
    section: "Self-service",
    permissions: ["employee_profile.view"],
  },
  {
    title: "Attendance",
    href: ACCOUNTANT_ROUTES.attendance,
    icon: CalendarCheck,
    section: "Self-service",
    permissions: ["attendance.view"],
  },
  {
    title: "Documents",
    href: ACCOUNTANT_ROUTES.documents,
    icon: FileText,
    section: "Self-service",
    permissions: ["documents.view"],
  },
  {
    title: "Leave",
    href: ACCOUNTANT_ROUTES.leave,
    icon: CalendarDays,
    section: "Self-service",
    permissions: ["leave.view"],
  },
  {
    title: "My Goals",
    href: ACCOUNTANT_ROUTES.goals,
    icon: Target,
    section: "Self-service",
  },
  {
    title: "Assets",
    href: ACCOUNTANT_ROUTES.assets,
    icon: LaptopMinimal,
    section: "Self-service",
  },
  {
    title: "Notifications",
    href: ACCOUNTANT_ROUTES.notifications,
    icon: Bell,
    section: "Self-service",
    permissions: ["notifications.view", "notification.view"],
  },
  {
    title: "Settings",
    href: ACCOUNTANT_ROUTES.settings,
    icon: Settings,
    section: "Self-service",
  },

  // ── Administration (org finance) ─────────────────────────────────
  {
    title: "Finance Dashboard",
    href: ACCOUNTANT_ROUTES.financeDashboard,
    icon: LayoutDashboard,
    section: "Administration",
    permissions: ["payroll.view", "payroll.view_all", "payslip.view", "payslips.view"],
  },
  {
    title: "Team Payroll",
    href: ACCOUNTANT_ROUTES.payrollRun,
    icon: Wallet,
    section: "Administration",
    permissions: ["payroll.view", "payroll.view_all", "payslip.view", "payslips.view"],
  },
  {
    title: "Reports",
    href: ACCOUNTANT_ROUTES.reportsPayroll,
    icon: BarChart3,
    section: "Administration",
    permissions: ["reports.view", "payroll_reports.view", "payroll.view"],
  },
];
