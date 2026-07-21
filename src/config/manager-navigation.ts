import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Target,
  Users,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";
import { MANAGER_ROUTES } from "@/lib/manager/constants";

export const managerNavItems: NavigationItem[] = [
  {
    title: "Dashboard",
    href: MANAGER_ROUTES.home,
    icon: LayoutDashboard,
  },
  {
    title: "My Attendance",
    href: MANAGER_ROUTES.profile,
    icon: CalendarCheck,
  },
  {
    title: "My Team",
    href: MANAGER_ROUTES.team,
    icon: Users,
    permissions: ["employee.view"],
  },
  {
    title: "Team Attendance",
    href: MANAGER_ROUTES.attendance,
    icon: CalendarCheck,
    permissions: ["attendance.view"],
  },
  {
    title: "Leave",
    href: MANAGER_ROUTES.leave,
    icon: CalendarDays,
    permissions: ["leave.view"],
  },
  {
    title: "Performance",
    href: MANAGER_ROUTES.performance,
    icon: Target,
    permissions: ["performance.view"],
  },
  {
    title: "Recruitment",
    href: MANAGER_ROUTES.recruitment,
    icon: BriefcaseBusiness,
    permissions: ["recruitment.view"],
  },
  {
    title: "Reports",
    href: MANAGER_ROUTES.reports,
    icon: BarChart3,
    permissions: ["reports.view"],
  },
  {
    title: "Notifications",
    href: MANAGER_ROUTES.notificationsCenter,
    icon: Bell,
    permissions: ["notifications.view", "notification.view"],
  },
  {
    title: "Settings",
    href: MANAGER_ROUTES.settings,
    icon: Settings,
  },
];
