import {
  Banknote,
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export const mainNavItems: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Employees",
    href: "/dashboard/employees",
    icon: Users,
    permissions: ["employee.view"],
  },
  {
    title: "Attendance",
    href: "/dashboard/attendance",
    icon: CalendarCheck,
    permissions: ["attendance.view"],
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
    icon: Banknote,
    permissions: ["payroll.view"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    permissions: ["settings.view"],
  },
];
