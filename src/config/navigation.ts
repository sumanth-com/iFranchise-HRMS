import {
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Target,
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
    title: "Performance",
    href: "/dashboard/performance",
    icon: Target,
    permissions: ["performance.view"],
  },
  {
    title: "Recruitment",
    href: "/dashboard/recruitment",
    icon: BriefcaseBusiness,
    permissions: ["recruitment.view"],
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
    icon: Package,
    permissions: ["asset.view"],
  },
  {
    title: "Exit Management",
    href: "/dashboard/exit",
    icon: LogOut,
    permissions: ["exit.view"],
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    permissions: ["reports.view"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    permissions: ["settings.view"],
  },
];
