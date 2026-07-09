import {
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Shield,
  Bell,
  ScrollText,
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
  section?: string;
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
    title: "Roles & Permissions",
    href: "/dashboard/roles",
    icon: Shield,
    section: "Administration",
    permissions: ["role.view", "permission.view", "user_role.view"],
  },
  {
    title: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    section: "Administration",
    permissions: ["notifications.view", "notification.view"],
  },
  {
    title: "Audit Logs",
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
