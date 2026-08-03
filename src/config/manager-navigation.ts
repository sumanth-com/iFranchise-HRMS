import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Wallet,
  Settings,
  Target,
  UserRound,
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
    title: "My Profile",
    href: MANAGER_ROUTES.profile,
    icon: UserRound,
    permissions: ["employee_profile.view"],
  },
  {
    title: "Attendance",
    href: MANAGER_ROUTES.attendance,
    icon: CalendarCheck,
  },
  {
    title: "My Team",
    href: MANAGER_ROUTES.team,
    icon: Users,
    permissions: ["employee.view"],
  },
  {
    title: "Payroll",
    href: MANAGER_ROUTES.payroll,
    icon: Wallet,
    permissions: ["payslip.view"],
  },
  {
    title: "Documents",
    href: MANAGER_ROUTES.documents,
    icon: FileText,
    permissions: ["documents.view"],
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
