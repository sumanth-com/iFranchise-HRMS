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
  Package,
  Settings,
  Shield,
  Target,
  UserRound,
  UserRoundPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";
import { HR_HUB_ROUTES } from "@/lib/dashboard/hr-hub-routes";
import { HR_OVERVIEW_ROUTES } from "@/lib/dashboard/constants";
import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";
import { SELF_PROFILE_ROUTES } from "@/lib/documents/constants";
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
 * Self-service (personal workspace) is listed first.
 * Administration (org-wide HR) follows — Employees sits directly after HR Overview.
 */
export const mainNavItems: NavigationItem[] = [
  // ── Self-service (personal workspace) ────────────────────────────
  {
    title: "Dashboard",
    href: HR_PORTAL_HOME,
    icon: LayoutDashboard,
    section: "Self-service",
  },
  {
    title: "My Profile",
    href: SELF_PROFILE_ROUTES.profile,
    icon: UserRound,
    section: "Self-service",
    permissions: ["employee_profile.view"],
  },
  {
    title: "Attendance",
    href: HR_HUB_ROUTES.myAttendance,
    icon: CalendarCheck,
    section: "Self-service",
    permissions: ["attendance.view"],
  },
  {
    title: "Payroll",
    href: HR_HUB_ROUTES.myPayroll,
    icon: Wallet,
    section: "Self-service",
    permissions: ["payroll.view", "payslip.view"],
  },
  {
    title: "Documents",
    href: HR_HUB_ROUTES.myDocuments,
    icon: FileText,
    section: "Self-service",
    permissions: ["documents.view"],
  },
  {
    title: "Leave",
    href: HR_HUB_ROUTES.myLeave,
    icon: CalendarDays,
    section: "Self-service",
    permissions: ["leave.view"],
  },
  {
    title: "My Goals",
    href: HR_HUB_ROUTES.myGoals,
    icon: Target,
    section: "Self-service",
    permissions: ["performance.view"],
  },
  {
    title: "Assets",
    href: HR_HUB_ROUTES.myAssets,
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
    title: "Recruitment",
    href: "/dashboard/recruitment",
    icon: BriefcaseBusiness,
    section: "Administration",
    permissions: ["recruitment.view"],
  },
  {
    title: "Team Attendance",
    href: HR_HUB_ROUTES.teamAttendance,
    icon: CalendarCheck,
    section: "Administration",
    permissions: ["attendance.view"],
  },
  {
    title: "Team Leave",
    href: HR_HUB_ROUTES.teamLeave,
    icon: CalendarDays,
    section: "Administration",
    permissions: ["leave.view"],
  },
  {
    title: "Team Payroll",
    href: HR_HUB_ROUTES.teamPayroll,
    icon: Wallet,
    section: "Administration",
    permissions: ["payroll.view", "payslip.view"],
  },
  {
    title: "Company Assets",
    href: HR_HUB_ROUTES.teamAssets,
    icon: LaptopMinimal,
    section: "Administration",
    permissions: ["asset.view"],
  },
  {
    title: "Performance",
    href: "/dashboard/performance",
    icon: Target,
    section: "Administration",
    permissions: ["performance.view"],
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
    title: "User Provisioning",
    href: USER_PROVISIONING_ROUTES.hr,
    icon: UserRoundPlus,
    section: "Administration",
    permissions: ["user_provisioning.view", "user_provisioning.manage"],
  },
  {
    title: "Roles & Access",
    href: "/dashboard/roles",
    icon: Shield,
    section: "Administration",
    permissions: ["role.view", "permission.view", "user_role.view"],
  },
];
