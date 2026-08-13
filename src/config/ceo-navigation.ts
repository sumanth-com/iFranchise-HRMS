import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CheckSquare,
  LayoutDashboard,
  Settings,
  Target,
  UserRound,
  UserRoundPlus,
  Wallet,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";
import { CEO_ROUTES } from "@/lib/ceo/constants";

export const ceoNavItems: NavigationItem[] = [
  {
    title: "Dashboard",
    href: CEO_ROUTES.home,
    icon: LayoutDashboard,
  },
  {
    title: "My Profile",
    href: CEO_ROUTES.profile,
    icon: UserRound,
  },
  {
    title: "Organization",
    href: CEO_ROUTES.organization,
    icon: Building2,
    permissions: ["organization.view", "employee.view"],
  },
  {
    title: "Recruitment",
    href: CEO_ROUTES.recruitment,
    icon: BriefcaseBusiness,
    permissions: ["recruitment.view"],
  },
  {
    title: "Performance",
    href: CEO_ROUTES.performance,
    icon: Target,
    permissions: ["performance.view"],
  },
  {
    title: "Attendance",
    href: CEO_ROUTES.attendance,
    icon: CalendarCheck,
    permissions: ["attendance.view"],
  },
  {
    title: "Approvals",
    href: CEO_ROUTES.approvals,
    icon: CheckSquare,
  },
  {
    title: "Company Payroll",
    href: CEO_ROUTES.payroll,
    icon: Wallet,
  },
  {
    title: "Reports",
    href: CEO_ROUTES.reports,
    icon: BarChart3,
  },
  {
    title: "Notifications",
    href: CEO_ROUTES.notifications,
    icon: Bell,
    permissions: ["notifications.view", "notification.view"],
  },
  {
    title: "User Provisioning",
    href: CEO_ROUTES.userProvisioning,
    icon: UserRoundPlus,
  },
  {
    title: "Settings",
    href: CEO_ROUTES.settings,
    icon: Settings,
  },
];
