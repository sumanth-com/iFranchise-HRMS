import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  FileText,
  LaptopMinimal,
  LayoutDashboard,
  Wallet,
  Settings,
  Target,
  UserRound,
  Users,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";
import { MANAGER_ROUTES } from "@/lib/manager/constants";

/**
 * Manager portal sidebar.
 * Self-service (personal workspace) is listed first.
 * Administration (team management) follows — same pattern as the HR portal.
 */
export const managerNavItems: NavigationItem[] = [
  // ── Self-service (personal workspace) ────────────────────────────
  {
    title: "Dashboard",
    href: MANAGER_ROUTES.home,
    icon: LayoutDashboard,
    section: "Self-service",
  },
  {
    title: "My Profile",
    href: MANAGER_ROUTES.profile,
    icon: UserRound,
    section: "Self-service",
    permissions: ["employee_profile.view"],
  },
  {
    title: "Employee Directory",
    href: MANAGER_ROUTES.directory,
    icon: Users,
    section: "Self-service",
  },
  {
    title: "Attendance",
    href: MANAGER_ROUTES.attendance,
    icon: CalendarCheck,
    section: "Self-service",
    permissions: ["attendance.view"],
  },
  {
    title: "Payroll",
    href: MANAGER_ROUTES.payroll,
    icon: Wallet,
    section: "Self-service",
    permissions: ["payroll.view", "payslip.view"],
  },
  {
    title: "Documents",
    href: MANAGER_ROUTES.documents,
    icon: FileText,
    section: "Self-service",
    permissions: ["documents.view"],
  },
  {
    title: "Leave",
    href: MANAGER_ROUTES.leave,
    icon: CalendarDays,
    section: "Self-service",
    permissions: ["leave.view"],
  },
  {
    title: "My Goals",
    href: MANAGER_ROUTES.goals,
    icon: Target,
    section: "Self-service",
    permissions: ["performance.view"],
  },
  {
    title: "Assets",
    href: MANAGER_ROUTES.assets,
    icon: LaptopMinimal,
    section: "Self-service",
    permissions: ["asset.view"],
  },
  {
    title: "Notifications",
    href: MANAGER_ROUTES.notificationsCenter,
    icon: Bell,
    section: "Self-service",
    permissions: ["notifications.view", "notification.view"],
  },
  {
    title: "Settings",
    href: MANAGER_ROUTES.settings,
    icon: Settings,
    section: "Self-service",
  },

  // ── Administration (team) ────────────────────────────────────────
  {
    title: "Manager Overview",
    href: MANAGER_ROUTES.overview,
    icon: LayoutDashboard,
    section: "Administration",
    permissions: ["employee.view"],
  },
  {
    title: "Teammates",
    href: MANAGER_ROUTES.team,
    icon: Users,
    section: "Administration",
    permissions: ["employee.view"],
  },
  {
    title: "Team Attendance",
    href: MANAGER_ROUTES.attendanceTeam,
    icon: CalendarCheck,
    section: "Administration",
  },
  {
    title: "Team Leave",
    href: MANAGER_ROUTES.leaveTeam,
    icon: CalendarDays,
    section: "Administration",
    permissions: ["leave.view"],
  },
  {
    title: "Performance",
    href: MANAGER_ROUTES.performance,
    icon: Target,
    section: "Administration",
  },
  {
    title: "Recruitment",
    href: MANAGER_ROUTES.recruitment,
    icon: BriefcaseBusiness,
    section: "Administration",
  },
  {
    title: "Reports",
    href: MANAGER_ROUTES.reports,
    icon: BarChart3,
    section: "Administration",
  },
];
