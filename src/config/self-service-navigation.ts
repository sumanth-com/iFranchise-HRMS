import {
  Bell,
  CalendarCheck,
  CalendarDays,
  FileText,
  LaptopMinimal,
  LayoutDashboard,
  Receipt,
  Settings,
  Target,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";

/** Portal-specific hrefs for the standard Employee Self-Service module set. */
export type SelfServiceRouteMap = {
  home: string;
  profile: string;
  directory: string;
  attendance: string;
  payroll: string;
  reimbursements: string;
  documents: string;
  leave: string;
  goals: string;
  assets: string;
  announcements: string;
  notifications: string;
  settings: string;
};

const SELF_SERVICE_SECTION = "Self-service";

/**
 * Canonical Self-Service sidebar items (Employee module set).
 * Callers supply portal-local hrefs; permission codes stay feature-scoped.
 */
export function buildSelfServiceNavItems(
  routes: SelfServiceRouteMap,
  options?: { includeSection?: boolean },
): NavigationItem[] {
  const section = options?.includeSection === false ? undefined : SELF_SERVICE_SECTION;

  return [
    {
      title: "Dashboard",
      href: routes.home,
      icon: LayoutDashboard,
      section,
    },
    {
      title: "My Profile",
      href: routes.profile,
      icon: UserRound,
      section,
      permissions: ["employee_profile.view"],
    },
    {
      title: "Employee Directory",
      href: routes.directory,
      icon: Users,
      section,
    },
    {
      title: "Attendance",
      href: routes.attendance,
      icon: CalendarCheck,
      section,
      permissions: ["attendance.view"],
    },
    {
      title: "Payroll",
      href: routes.payroll,
      icon: Wallet,
      section,
      permissions: ["payslip.view", "payroll.view"],
    },
    {
      title: "Reimbursements",
      href: routes.reimbursements,
      icon: Receipt,
      section,
      permissions: ["reimbursement.view", "reimbursement.create"],
    },
    {
      title: "Documents",
      href: routes.documents,
      icon: FileText,
      section,
      permissions: ["documents.view"],
    },
    {
      title: "Leave",
      href: routes.leave,
      icon: CalendarDays,
      section,
      permissions: ["leave.view"],
    },
    {
      title: "My Goals",
      href: routes.goals,
      icon: Target,
      section,
    },
    {
      title: "Assets",
      href: routes.assets,
      icon: LaptopMinimal,
      section,
    },
    // Company announcements live on the Self-Service dashboard (Announcements tab),
    // not as a separate sidebar module. Route maps may still keep `announcements` for deep links.
    {
      title: "Notifications",
      href: routes.notifications,
      icon: Bell,
      section,
      permissions: ["notification.view", "notifications.view"],
    },
    {
      title: "Settings",
      href: routes.settings,
      icon: Settings,
      section,
    },
  ];
}
