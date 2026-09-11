import {
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  Target,
  Users,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";
import { buildSelfServiceNavItems } from "@/config/self-service-navigation";
import { MANAGER_ROUTES } from "@/lib/manager/constants";

/**
 * Manager portal sidebar.
 * Self-service (personal workspace) is listed first.
 * Administration (team management) follows — same pattern as the HR portal.
 */
export const managerNavItems: NavigationItem[] = [
  ...buildSelfServiceNavItems({
    home: MANAGER_ROUTES.home,
    profile: MANAGER_ROUTES.profile,
    directory: MANAGER_ROUTES.directory,
    attendance: MANAGER_ROUTES.attendance,
    payroll: MANAGER_ROUTES.payroll,
    reimbursements: MANAGER_ROUTES.reimbursements,
    documents: MANAGER_ROUTES.documents,
    leave: MANAGER_ROUTES.leave,
    goals: MANAGER_ROUTES.goals,
    assets: MANAGER_ROUTES.assets,
    announcements: MANAGER_ROUTES.announcements,
    notifications: MANAGER_ROUTES.notificationsCenter,
    settings: MANAGER_ROUTES.settings,
  }),

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
