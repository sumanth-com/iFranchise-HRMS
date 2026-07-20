import {
  Banknote,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  FileText,
  LaptopMinimal,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Shield,
  ScrollText,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  section?: string;
};

/**
 * HR portal sidebar.
 * Top = employee self-service (same perspective as the employee portal).
 * Administration = org-wide HR operations and system tools.
 */
export const mainNavItems: NavigationItem[] = [
  // ── Self-service (employee perspective) ──────────────────────────
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Attendance",
    href: "/dashboard/attendance",
    icon: CalendarCheck,
    permissions: ["attendance.view"],
  },
  {
    title: "Employee Directory",
    href: "/dashboard/directory",
    icon: Users,
    permissions: ["employee.view"],
  },
  {
    title: "Leave",
    href: "/dashboard/leave",
    icon: CalendarDays,
    permissions: ["leave.view"],
  },
  {
    title: "Payroll",
    href: "/dashboard/payroll",
    icon: Wallet,
    permissions: ["payroll.view", "payslip.view"],
  },
  {
    title: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
    permissions: ["documents.view"],
  },
  {
    title: "Assets",
    href: "/dashboard/assets",
    icon: LaptopMinimal,
    permissions: ["asset.view"],
  },
  {
    title: "Notifications",
    href: "/dashboard/notifications/center",
    icon: Bell,
    permissions: ["notifications.view", "notification.view"],
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },

  // ── Administration (org-wide) ────────────────────────────────────
  {
    title: "Employees",
    href: "/dashboard/employees",
    icon: Users,
    section: "Administration",
    permissions: ["employee.view"],
  },
  {
    title: "Attendance Management",
    href: "/dashboard/attendance-management",
    icon: CalendarCheck,
    section: "Administration",
    permissions: ["attendance.view", "attendance.create", "attendance.edit", "attendance.approve"],
  },
  {
    title: "Leave Management",
    href: "/dashboard/leave-management",
    icon: CalendarDays,
    section: "Administration",
    permissions: ["leave.view", "leave.approve", "leave_balance.view"],
  },
  {
    title: "Payroll Management",
    href: "/dashboard/payroll-management",
    icon: Banknote,
    section: "Administration",
    permissions: ["payroll.view", "payroll.generate", "payroll.approve", "payslip.view"],
  },
  {
    title: "Documents Management",
    href: "/dashboard/documents-management",
    icon: FileText,
    section: "Administration",
    permissions: ["documents.view", "documents.manage", "documents.verify"],
  },
  {
    title: "Assets Management",
    href: "/dashboard/assets-management",
    icon: Package,
    section: "Administration",
    permissions: ["asset.view", "asset.create", "asset.edit", "asset.assign"],
  },
  {
    title: "Performance",
    href: "/dashboard/performance",
    icon: Target,
    section: "Administration",
    permissions: ["performance.view"],
  },
  {
    title: "Recruitment",
    href: "/dashboard/recruitment",
    icon: BriefcaseBusiness,
    section: "Administration",
    permissions: ["recruitment.view"],
  },
  {
    title: "Exit Management",
    href: "/dashboard/exit",
    icon: LogOut,
    section: "Administration",
    permissions: ["exit.view"],
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    section: "Administration",
    permissions: ["reports.view"],
  },
  {
    title: "Organization",
    href: "/dashboard/organization",
    icon: Building2,
    section: "Administration",
    permissions: [
      "organization.view",
      "branch.view",
      "department.view",
      "designation.view",
      "employment_type.view",
      "holiday.view",
      "work_location.view",
      "shift_template.view",
    ],
  },
  {
    title: "Notifications Management",
    href: "/dashboard/notifications",
    icon: Bell,
    section: "Administration",
    permissions: ["notifications.view", "notification.view"],
  },
  {
    title: "Roles & Permissions",
    href: "/dashboard/roles",
    icon: Shield,
    section: "Administration",
    permissions: ["role.view", "permission.view", "user_role.view"],
  },
  {
    title: "Audit Logs",
    href: "/dashboard/audit",
    icon: ScrollText,
    section: "Administration",
    permissions: ["audit.view"],
  },
  {
    title: "Company Settings",
    href: "/dashboard/company-settings",
    icon: Settings,
    section: "Administration",
    permissions: ["settings.view"],
  },
];
