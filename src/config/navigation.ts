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
  UserRoundPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";
import { HR_OVERVIEW_ROUTES } from "@/lib/dashboard/constants";
import { USER_PROVISIONING_ROUTES } from "@/lib/user-provisioning/constants";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  section?: string;
};

/**
 * HR portal sidebar.
 * Self-service = personal workspace (attendance, leave, payslips, etc.).
 * Administration = org-wide HR operations and system tools.
 */
export const mainNavItems: NavigationItem[] = [
  // ── Self-service (personal workspace) ────────────────────────────
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    section: "Self-service",
  },
  {
    title: "Attendance",
    href: "/dashboard/attendance",
    icon: CalendarCheck,
    section: "Self-service",
    permissions: ["attendance.view"],
  },
  {
    title: "Leave",
    href: "/dashboard/leave",
    icon: CalendarDays,
    section: "Self-service",
    permissions: ["leave.view"],
  },
  {
    title: "Payroll",
    href: "/dashboard/payroll",
    icon: Wallet,
    section: "Self-service",
    permissions: ["payroll.view", "payslip.view"],
  },
  {
    title: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
    section: "Self-service",
    permissions: ["documents.view"],
  },
  {
    title: "Assets",
    href: "/dashboard/assets",
    icon: LaptopMinimal,
    section: "Self-service",
    permissions: ["asset.view"],
  },
  {
    title: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    section: "Self-service",
    permissions: ["notifications.view", "notification.view"],
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    section: "Self-service",
  },

  // ── Administration (org-wide) ────────────────────────────────────
  {
    title: "HR Overview",
    href: HR_OVERVIEW_ROUTES.overview,
    icon: LayoutDashboard,
    section: "Administration",
    permissions: ["employee.view"],
  },
  {
    title: "Employees",
    href: "/dashboard/employees",
    icon: Users,
    section: "Administration",
    permissions: ["employee.view"],
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
    title: "Offboarding",
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
    title: "Roles & Access",
    href: "/dashboard/roles",
    icon: Shield,
    section: "Administration",
    permissions: ["role.view", "permission.view", "user_role.view"],
  },
  {
    title: "User Provisioning",
    href: USER_PROVISIONING_ROUTES.hr,
    icon: UserRoundPlus,
    section: "Administration",
    permissions: ["user_provisioning.view", "user_provisioning.manage"],
  },
  {
    title: "Audit Trail",
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
