import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  LaptopMinimal,
  Shield,
  Target,
  UserRoundPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";
import { buildSelfServiceNavItems } from "@/config/self-service-navigation";
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
  ...buildSelfServiceNavItems({
    home: HR_PORTAL_HOME,
    profile: SELF_PROFILE_ROUTES.profile,
    directory: HR_HUB_ROUTES.directory,
    attendance: HR_HUB_ROUTES.myAttendance,
    payroll: HR_HUB_ROUTES.myPayroll,
    reimbursements: HR_HUB_ROUTES.myReimbursements,
    documents: HR_HUB_ROUTES.myDocuments,
    leave: HR_HUB_ROUTES.myLeave,
    goals: HR_HUB_ROUTES.myGoals,
    assets: HR_HUB_ROUTES.myAssets,
    announcements: HR_HUB_ROUTES.myAnnouncements,
    notifications: "/dashboard/notifications",
    settings: "/dashboard/settings",
  }),

  // ── Administration (org-wide) ───────────────────────────────────────────
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
    href: "/dashboard/recruitment/jobs",
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
    href: "/dashboard/reports/attendance",
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
