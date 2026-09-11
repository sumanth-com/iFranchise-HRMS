import {
  BarChart3,
  LayoutDashboard,
  Wallet,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";
import { buildSelfServiceNavItems } from "@/config/self-service-navigation";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";

/**
 * Accountant portal sidebar — Self-service + Administration.
 * Org reimbursements stay under Team Payroll tabs (not a duplicate Admin nav item).
 */
export const accountantNavItems: NavigationItem[] = [
  ...buildSelfServiceNavItems({
    home: ACCOUNTANT_ROUTES.home,
    profile: ACCOUNTANT_ROUTES.profile,
    directory: ACCOUNTANT_ROUTES.directory,
    attendance: ACCOUNTANT_ROUTES.attendance,
    payroll: ACCOUNTANT_ROUTES.myPayroll,
    reimbursements: ACCOUNTANT_ROUTES.myReimbursements,
    documents: ACCOUNTANT_ROUTES.documents,
    leave: ACCOUNTANT_ROUTES.leave,
    goals: ACCOUNTANT_ROUTES.goals,
    assets: ACCOUNTANT_ROUTES.assets,
    announcements: ACCOUNTANT_ROUTES.announcements,
    notifications: ACCOUNTANT_ROUTES.notifications,
    settings: ACCOUNTANT_ROUTES.settings,
  }),

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
