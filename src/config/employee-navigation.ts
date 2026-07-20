import {
  Bell,
  CalendarCheck,
  CalendarDays,
  FileText,
  LaptopMinimal,
  LayoutDashboard,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";

export const employeeNavItems: NavigationItem[] = [
  {
    title: "Dashboard",
    href: EMPLOYEE_ROUTES.home,
    icon: LayoutDashboard,
  },
  {
    title: "Attendance",
    href: EMPLOYEE_ROUTES.attendance,
    icon: CalendarCheck,
    permissions: ["attendance.view"],
  },
  {
    title: "Employee Directory",
    href: EMPLOYEE_ROUTES.directory,
    icon: Users,
    permissions: ["employee.view"],
  },
  {
    title: "Leave",
    href: EMPLOYEE_ROUTES.leave,
    icon: CalendarDays,
    permissions: ["leave.view"],
  },
  {
    title: "Payroll",
    href: EMPLOYEE_ROUTES.payroll,
    icon: Wallet,
    permissions: ["payslip.view"],
  },
  {
    title: "Documents",
    href: EMPLOYEE_ROUTES.documents,
    icon: FileText,
    permissions: ["documents.view"],
  },
  {
    title: "Assets",
    href: EMPLOYEE_ROUTES.assets,
    icon: LaptopMinimal,
  },
  {
    title: "Notifications",
    href: EMPLOYEE_ROUTES.notifications,
    icon: Bell,
    permissions: ["notification.view"],
  },
  {
    title: "Settings",
    href: EMPLOYEE_ROUTES.settings,
    icon: Settings,
  },
];
